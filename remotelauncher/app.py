from datetime import datetime as dt, timedelta
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.datastructures import FileStorage
from flask_sqlalchemy import SQLAlchemy
from flask_caching import Cache
from threading import Thread
from io import BytesIO
from selectors import DefaultSelector, EVENT_READ
from subprocess import Popen, PIPE, DEVNULL
from flask_babel import Babel, gettext
from urllib.request import Request, urlopen
from PIL.Image import open as imgopen
from functools import wraps
from filetype import guess
from os import rename, makedirs, environ, path

from flask import (Flask, make_response, redirect, render_template,
                   url_for, send_from_directory, jsonify, g, request)

from .platforms import (askdirectory, openfolder, notify,
                       APPNAME, CONFIGNAMES, DATA_DIR, RESOURCES_DIR)

from shutil import rmtree
from sys import stderr

def etag(kwargs):
    response = make_response(kwargs)
    response.last_modified = dt.utcnow()
    response.add_etag()
    return response

def cache_header(max_age, **ckwargs):
    def decorator(view):
        f = cache.cached(max_age, **ckwargs)(view)

        @wraps(f)
        def wrapper(*args, **wkwargs):
            response = f(*args, **wkwargs)
            response.cache_control.max_age = max_age
            response.cache_control.public = True
            extra = timedelta(seconds=max_age)
            response.expires = response.last_modified + extra
            return response.make_conditional(request)
        return wrapper

    return decorator

def get_locale():
    if 'lang' in request.cookies:
        app.config['LANGUAGE'] = request.cookies.get("lang")
    elif request.accept_languages:
        app.config['LANGUAGE'] = request.accept_languages.best_match(app.config['LANGUAGES'])
    return app.config['LANGUAGE']

def get_timezone():
    user = getattr(g, 'user', None)
    if user is not None:
        return user.timezone

def configlocalizedname(config):
    if config.name == CONFIGNAMES[0]:
        return gettext("Global prefix")
    if config.name == CONFIGNAMES[1]:
        return gettext("Default working directory")
    if config.name == CONFIGNAMES[2]:
        return gettext('"Achievements" path')
    if config.name == CONFIGNAMES[3]:
        return gettext("Schema generate tool path")
    return '!ErrorNoName!'

    # 烂到要死的解决方法
    # return eval(''.join(['config.', get_locale(), '_name']))


app = Flask(__name__)
app.config.update(
    APPNAME=APPNAME,
    DESCRIPTION=gettext('A launcher to launch program.'),
    JSON_AS_ASCII=False,
    SQLALCHEMY_DATABASE_URI=f'sqlite:///{path.join(DATA_DIR, "configs.db")}',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    UPLOAD_FOLDER=RESOURCES_DIR,
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    CACHE_TYPE='SimpleCache',
    CACHE_DEFAULT_TIMEOUT=300,
    LANGUAGE='en',
    LANGUAGES={
        'en': 'English',
        'zh': '中文'
    }
)

db = SQLAlchemy(app)
babel = Babel(app, locale_selector=get_locale, timezone_selector=get_timezone)
cache = Cache(app)


class ThreadWithReturnValue(Thread):
    
    def __init__(self, group=None, target=None, name=None,
                 args=(), kwargs={}, Verbose=None):
        Thread.__init__(self, group, target, name, args, kwargs)
        self._return = None

    def run(self):
        if self._target is not None:
            self._return = self._target(*self._args,
                                                **self._kwargs)
    def join(self, *args):
        Thread.join(self, *args)
        return self._return

class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(100), nullable=False)


class Program(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(), unique=False, nullable=False)
    workdir = db.Column(db.String(), unique=False)
    prefix = db.Column(db.String(), unique=False)
    command = db.Column(db.String(), unique=False, nullable=False)


@app.get('/')
def page_index():
    return render_template('index.html', appname=APPNAME, languages=app.config['LANGUAGES'], get_locale=get_locale,
                           configlocalizedname=configlocalizedname, programs=Program.query.all(),
                           configs=Config.query.all())

@app.get('/offline')
def page_offline():
    return render_template('offline.html', appname=APPNAME, get_locale=get_locale)

@app.get('/html/picview')
def html_picview():
    return render_template('picview.html', str=str, programs=Program.query.all())

@app.get('/html/tableview')
def html_tableview():
    return render_template('tableview.html', str=str, programs=Program.query.all())

@app.get('/detail/<int:program_id>')
def page_detail(program_id):
    return render_template('detail.html', get_locale=get_locale,
                           program=Program.query.get_or_404(program_id))

@app.get('/data/<path:filename>')
def data_get(filename):
    try:
        return send_from_directory(DATA_DIR, filename)
    except:
        if filename.endswith(".jpg"):
            return send_from_directory(path.join(app.root_path, 'static'), 'pic/fallback.png')
        else:
            return '', 204

@app.get('/data/stdownconf/<int:program_id>')
def stdownconf(program_id):
    # todo: 真正在后台生成模拟器配置文件
    return '', 200

@app.post('/data/dbconf')
def data_dbconf():
    for key, value in request.form.items():
        config = Config.query.filter_by(name=key).first()
        if config:
            # 如果已经存在该记录，更新 value 字段
            config.value = value
        else:
            # 如果不存在该记录，插入一条新记录
            config = Config(name=key, value=value)
            db.session.add(config)
    db.session.commit()
    return '', 204
    # return redirect(url_for('index'))

@app.post('/data/upload/<path:program_id>')
def data_upload(program_id):
    try:
        filedest = path.join(RESOURCES_DIR, program_id.split('-')[-1])
        if request.content_type == 'application/json':
            url = request.get_json().get('url')
            urlfile = urlopen(Request(url, headers={'User-Agent': 'Mozilla'}))
            if int(urlfile.headers['Content-Length']) > app.config['MAX_CONTENT_LENGTH']:
                raise RequestEntityTooLarge()
            file = FileStorage(stream=BytesIO(urlfile.read()), filename=path.basename(url))
        else:
            file = request.files['file']
        return save_file(file, filedest)
    except RequestEntityTooLarge:
        return gettext("File size exceeds the limit"), 413
    except Exception as e:
        return str(e), 400

def save_file(file, filedest):
    kind = guess(file)
    if kind.mime.startswith('image'):
        savepath = path.join(filedest, 'library.jpg')
        match kind.extension:
            case 'ico':
                savepath = path.join(filedest, 'icon.ico')
                # img = imgopen(file)
                # img.verify
                # img = img.resize([256, 256], resample=4)
                # img = img.convert('RGBA')
                # img.save(savepath, format='ICO', sizes=[(256, 256)])
                file.save(savepath)
            case 'jpg':
                file.save(savepath)
            case _:
                img = imgopen(file)
                img = img.convert('RGB')
                img.save(savepath, format='JPEG')
    elif kind.extension == 'exe':
        # 增加了太多的复杂度。。。
        return gettext("File type not supported"), 415
    else:
        return gettext("File type not supported"), 415
    return path.basename(savepath), 201


@app.post('/apps/add/<int:program_realid>')
def apps_add(program_realid):
    id = request.form['program_id']
    name = request.form['program_name']
    workdir = request.form['program_workdir']
    prefix = request.form['program_prefix']
    command = request.form['program_command']
    if id == '0':
        new_program = Program(name=name, workdir=workdir,
                              prefix=prefix, command=command)
        db.session.add(new_program)
        db.session.commit()
        new_program_dir = path.join(RESOURCES_DIR, str(new_program.id))
        new_program_dirbak = path.join(new_program_dir + '.bak')
        try:
            makedirs(new_program_dir)
        except FileExistsError:
            try:
                rename(new_program_dir, new_program_dirbak)
            except FileExistsError:
                rmtree(path.join(new_program_dir + '.bak'))
                rename(new_program_dir, new_program_dirbak)
            makedirs(new_program_dir)
    else:
        program = Program.query.get_or_404(program_realid)
        program_dir = path.join(RESOURCES_DIR, str(program_realid))
        program_destdir = path.join(RESOURCES_DIR, str(id))
        # 在更改id的时候移动资源文件夹
        if str(program_realid) == id:
            pass
        elif Program.query.get(id):
            return render_template('detail.html', alert='1', formerid=id, program=program, get_locale=get_locale)
        elif path.exists(program_destdir):
            return render_template('detail.html', alert='2', formerid=id, program=program, get_locale=get_locale)
        else:
            try:
                rename(program_dir, program_destdir)
            except FileNotFoundError:
                makedirs(program_destdir)
            except:
                return 'failed move data', 400
        program.id = id
        program.name = name
        program.workdir = workdir
        program.prefix = prefix
        program.command = command
        db.session.commit()
        return redirect(url_for('page_detail', program_id=id, need_reload='1'))
    return redirect(request.referrer)


@app.get('/apps/del/<int:program_id>')
def apps_del(program_id):
    respath = path.join(RESOURCES_DIR, str(program_id))
    resbakpath = path.join(respath + '.bak')
    try:
        rename(respath, resbakpath)
    except FileNotFoundError:
        pass
    except Exception:
        rmtree(resbakpath)
        rename(respath, resbakpath)
    program = Program.query.get_or_404(program_id)
    db.session.delete(program)
    db.session.commit()
    return redirect(request.referrer)


@app.post('/apps/launch/<int:program_id>')
def apps_launch(program_id):

    # 成就查看器路径
    with_achi = request.form.get('withAchi')
    if with_achi:
        achipath = path.expandvars(
            path.expanduser(
                Config.query.filter_by(
                    name='config_achipath'
                ).first().value
            )
        )
        if not path.exists(achipath):
            return gettext('"Achievement" path not found'), 400

    # 环境变量
    program = Program.query.get_or_404(program_id)
    pdatadir = path.join(RESOURCES_DIR, str(program.id))
    iconpath = path.join(pdatadir, 'icon.ico')
    if not path.exists(iconpath):
        iconpath = path.join(app.root_path, 'static/pic/logo.png')
    try:
        # 发送通知，顺便防止开多
        if with_achi != 'onlyAchi':
            notify(title=program.name,
                   message='ID: '+str(program.id)+'\n'+gettext("Just been launched"),
                   app_icon=iconpath,
                   timeout=10)
    except:
        return 'TooOften!', 200

    appproc = ThreadWithReturnValue(target=launchapp, name='launchapp', args=(program, pdatadir))

    def achiwatcher():
        if not path.exists(achipath):
            raise Exception('Achievement path not valid')
        env = environ
        env['LnzAch_gamename'] = program.name
        process = Popen([achipath, str(program_id)],
            cwd=path.dirname(achipath),
            env=env,
            stderr=DEVNULL)
        return process

    def launchit(arg1, arg2):
        try:
            if with_achi == 'true':
                appproc.start()
                achi = achiwatcher()
                appreturn = appproc.join()
                achi.kill()
            elif with_achi == 'onlyAchi':
                achi = achiwatcher()
                appreturn = achi.wait()
            else:
                appproc.start()
                appreturn = appproc.join()
        except Exception as e:
            notify(title=program.name,
                   message='ID: '+str(program.id)+'\n'+arg2+': '+str(e),
                   app_icon=iconpath,
                   timeout=0,
                   hints={"urgency": 2})
            return
        # todo: 这里改一下，如果失败则在模板里显示提示
        if appreturn == 0:
            notify(title=program.name,
                   message='ID: '+str(program.id)+'\n'+arg1,
                   app_icon=iconpath,
                   timeout=10)
        else:
            notify(title=program.name,
                   message='ID: '+str(program.id)+'\n'+arg2+': '+str(appreturn),
                   app_icon=iconpath,
                   timeout=20)

    Thread(target=launchit, name='launchit',
           args=[gettext('App exited normally'), gettext('Something abnormal')]).start()
    return 'Sueecss!', 200

def launchapp(program, pdatadir):
    # 命令环境变量
    wideprefix = Config.query.filter_by(name='config_wideprefix').first()
    wideworkdir = Config.query.filter_by(name='config_wideworkdirpath').first()

    command = " ".join(
        [program.prefix, wideprefix.value, program.command])
    workdir = path.expandvars(path.expanduser(program.workdir)) \
           or path.expandvars(path.expanduser(wideworkdir.value)) \
           or path.expanduser('~')
    # programenv =

    try:
        with Popen(command, cwd=workdir, shell=True,
                universal_newlines=True, stdout=PIPE, stderr=PIPE) as process:
            # 获取the_stdout, the_stderr, the_retcode
            the_stdout, the_stderr, the_retcode = printlog(process, program.name)
            # 写入.log文件
            open(path.join(pdatadir, '.stdout.log'), 'w').write(the_stdout)
            open(path.join(pdatadir, '.stderr.log'), 'w').write(the_stderr)
            return the_retcode
    except Exception as e:
        return e

def printlog(p, who):
    # 获取程序LOG
    # https://stackoverflow.com/a/61585093
    # Read both stdout and stderr simultaneously
    sel = DefaultSelector()
    sel.register(p.stdout, EVENT_READ)
    sel.register(p.stderr, EVENT_READ)
    the_stderr = ''
    the_stdout = ''
    ok = True
    while ok:
        for key, val1 in sel.select():
            line = key.fileobj.readline()
            if not line:
                ok = False
                break
            if key.fileobj is p.stderr:
                the_stderr += line
                the_stdout += line
                print(f"[{who}] STDERR: {line}", end="", file=stderr)
            else:
                the_stdout += line
                print(f"[{who}] STDOUT: {line}", end="")
    return the_stdout, the_stderr, p.wait()


@app.get('/api/urls')
@cache_header(app.config['CACHE_DEFAULT_TIMEOUT'])
def api_urls():
    url_dict = {}
    for rule in app.url_map.iter_rules():
        url_dict[rule.endpoint] = rule.rule
    return etag(jsonify(url_dict))

@app.get('/api/askpath')
def api_askpath():
    dirpath = askdirectory()
    if dirpath:
        return dirpath, 200
    else:
        return '', 204

@app.get('/api/openresdir/<int:program_id>')
def api_openresdir(program_id):
    openfolder(path.join(RESOURCES_DIR, str(program_id)))
    return '', 204

@app.post('/api/opendir')
def api_opendir():
    appath = path.expandvars(path.expanduser(request.form['path']))
    if path.exists(appath):
        openfolder(appath)
    else:
        return gettext('Path not found')+': '+appath, 400
    return '', 204

@app.get('/api/appinfo/<int:program_id>')
def api_appinfo(program_id):
    appinfo = vars(Program.query.get_or_404(program_id))
    for key in list(appinfo.keys()):
        if key.startswith('_'):
            del appinfo[key]
    return etag(jsonify(appinfo))

@app.get('/template/<path:filename>')
def static_jinja2ed(filename):
    return render_template(filename)

@app.get('/favicon.ico')
def file_favicon():
    return send_from_directory(path.join(app.root_path, 'static'), 'pic/favicon.ico')

@app.get('/app.webmanifest')
def file_webmanifest():
    return render_template('app.webmanifest', appname=APPNAME,
                           appdes=app.config['DESCRIPTION'], get_locale=get_locale)

@app.get('/serviceworker.js')
@cache_header(app.config['CACHE_DEFAULT_TIMEOUT'])
def file_serviceworker():
    response = make_response(render_template('js/sw.js'))
    response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    return etag(response)


if __name__ == '__main__':
    print('Please do not directly run this file!')
