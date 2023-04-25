from datetime import datetime as dt, timedelta
from werkzeug.exceptions import RequestEntityTooLarge
from flask_sqlalchemy import SQLAlchemy
from threading import Thread
from selectors import DefaultSelector, EVENT_READ
from subprocess import Popen, PIPE, DEVNULL
from flask_babel import Babel, gettext
from urllib.request import Request, urlopen
from PIL.Image import open as imgopen
from platform import uname
from functools import wraps

from os import (rename, makedirs,
                environ, name, path)

from flask import (Flask, make_response, redirect, render_template, url_for,
                   send_from_directory, jsonify, g, request)

from shutil import rmtree
from sys import stderr
from plyer import notification
from flask_caching import Cache

if uname().system == 'Windows':
    from os import startfile as openfile
    data_dir = path.join(environ['APPDATA'], 'Weblauncher')
elif uname().system == 'Linux':
    def openfile(file):
        Popen(['xdg-open', file], stdout=DEVNULL, stderr=DEVNULL)
    if environ.get('XDG_DATA_HOME') is not None:
        data_dir = path.expandvars('$XDG_DATA_HOME/Weblauncher')
    else:
        data_dir = path.expandvars('$HOME/.local/share/Weblauncher')
else:
    from webbrowser import open as openfile
    data_dir = path.expanduser('~/.Weblauncher')

if not path.exists(data_dir):
    makedirs(data_dir)

config_names = ['config_wideprefix', 'config_wideworkdir']
resources_dir = path.join(data_dir, 'resources')

app = Flask(__name__)
app.config.update(
    APPNAME=gettext('RemoteLauncher'),
    DESCRIPTION=gettext('A launcher to launch program.'),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SQLALCHEMY_DATABASE_URI=f'sqlite:///{path.join(data_dir, "configs.db")}',
    UPLOAD_FOLDER=resources_dir,
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    CACHE_TYPE='SimpleCache',
    CACHE_DEFAULT_TIMEOUT=300,
    LANGUAGE='en',
    LANGUAGES={
        'en': 'English',
        'zh': '中文'
    }
)

cache = Cache(app)

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

def openfolder(folder):
    if path.isdir(folder):
        openfile(folder)

def get_locale():
    if 'lang' in request.cookies:
        app.config['LANGUAGE'] = request.cookies.get("lang")
    else:
        app.config['LANGUAGE'] = request.accept_languages.best_match(app.config['LANGUAGES'])
    return app.config['LANGUAGE']

def get_timezone():
    user = getattr(g, 'user', None)
    if user is not None:
        return user.timezone

def configlocalizedname(config):
    if config.name == config_names[0]:
        return gettext("Global prefix")
    if config.name == config_names[1]:
        return gettext("Default working directory")
    return '!ErrorNoName!'

    # 烂到要死的解决方法
    # return eval(''.join(['config.', get_locale(), '_name']))

db = SQLAlchemy(app)
babel = Babel(app, locale_selector=get_locale, timezone_selector=get_timezone)


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
    return render_template('index.html', appname=app.config['APPNAME'], languages=app.config['LANGUAGES'], get_locale=get_locale,
                           configlocalizedname=configlocalizedname, programs=Program.query.all(),
                           configs=Config.query.all())

@app.get('/api/urls')
@cache_header(app.config['CACHE_DEFAULT_TIMEOUT'])
def api_urls():
    url_dict = {}
    for rule in app.url_map.iter_rules():
        url_dict[rule.endpoint] = rule.rule
    return etag(jsonify(url_dict))

@app.get('/offline')
def page_offline():
    return render_template('offline.html', appname=app.config['APPNAME'], get_locale=get_locale)

@app.get('/html/picview')
def html_picview():
    return render_template('picview.html', str=str, programs=Program.query.all())

@app.get('/html/tableview')
def html_tableview():
    return render_template('tableview.html', str=str, programs=Program.query.all())

@app.get('/template/<path:filename>')
def static_jinja2ed(filename):
    return render_template(filename)

@app.get('/detail/<int:program_id>')
def page_detail(program_id):
    return render_template('detail.html', get_locale=get_locale,
                           program=Program.query.get_or_404(program_id))

@app.get('/api/opendir/<int:program_id>')
def api_opendir(program_id):
    program_dir = path.join(resources_dir, str(program_id))
    openfolder(program_dir)
    return ('', 204)

@app.get('/data/<path:filename>')
def data_get(filename):
    try:
        return send_from_directory(data_dir, filename)
    except:
        return '', 204

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
    return ('', 204)
    # return redirect(url_for('index'))

@app.route('/data/upload/<path:program_id>', methods=['GET', 'POST'])
def data_upload(program_id):
    try:
        filedest = path.join(resources_dir, program_id.split('-')[-1])
        if request.content_type == 'application/json':
            url = request.get_json().get('url')
            urlfile = urlopen(Request(url, headers={'User-Agent': 'Mozilla'}))
            if int(urlfile.headers['Content-Length']) > app.config['MAX_CONTENT_LENGTH']:
                raise RequestEntityTooLarge()
            basename = save_file(urlfile, filedest)
        else:
            file = request.files['file']
            basename = save_file(file, filedest)
        return basename, 201
    except ValueError as e:
        return str(e), 202
    except RequestEntityTooLarge:
        return gettext("File size exceeds the limit"), 413
    except Exception as e:
        return str(e), 400

def save_file(imgfile, filedest):
    with imgopen(imgfile) as img:
        img.verify
        match img.format:
            case 'ICO':
                filedest = path.join(filedest, 'icon.ico')
                img = img.resize([256, 256], resample=4)
                img = img.convert('RGBA')
                img.save(filedest, format='ICO', sizes=[(256, 256)])
            case 'JPEG' | 'PNG' | 'WEBP':
                filedest = path.join(filedest, 'library.jpg')
                if img.format == 'JPEG':
                    img.save(filedest, format='JPEG', quality='keep')
                else:
                    img = img.convert('RGB')
                    img.save(filedest, format='JPEG')
    return path.basename(filedest)


@app.route('/apps/add/<int:program_realid>', methods=['GET', 'POST'])
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
        new_program_dir = path.join(resources_dir, str(new_program.id))
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
        program_dir = path.join(resources_dir, str(program_realid))
        program_destdir = path.join(resources_dir, str(id))
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
    respath = path.join(resources_dir, str(program_id))
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
    # return redirect(url_for('index'))


@app.get('/apps/launch/<int:program_id>')
def apps_launch(program_id):
    # 环境变量
    program = Program.query.get_or_404(program_id)
    wideprefix = Config.query.filter_by(name='config_wideprefix').first()
    wideworkdir = Config.query.filter_by(name='config_wideworkdir').first()
    pdatadir = path.join(resources_dir, str(program.id))
    iconpath = path.join(pdatadir, 'icon.ico')
    if not path.exists(iconpath):
        iconpath = path.join(app.root_path, 'static/pic/logo.png')
    try:
        # 发送通知，顺便防止开多
        sendnote(iconpath, program.name,
                 'ID: ' + str(program.id) + '\n' + gettext("Just been launched"), 5)
    except:
        return 'too often', 204

    # todo: 这里改一下，如果失败则在模板里显示提示
    # 似乎不太可能实现了
    Thread(target=launchit, args=(program, wideprefix,
                                  wideworkdir, pdatadir, iconpath)).start()
    return '', 204

def launchit(program, wideprefix,
             wideworkdir, pdatadir, iconpath):
    # 命令环境变量
    command = " ".join(
        [wideprefix.value, program.prefix, program.command])
    workdir = path.expandvars(
        program.workdir
    ) or path.expandvars(
        wideworkdir.value
    ) or path.expanduser('~')
    # programenv =

    # 启动进程
    with Popen(command, cwd=workdir, shell=True,
               universal_newlines=True, stdout=PIPE, stderr=PIPE) as process:
        # 获取the_stdout, the_stderr, the_retcode
        the_stdout, the_stderr, the_retcode = printlog(process, program.name)
        # 写入.log文件
        open(path.join(pdatadir, 'stdout.log'), 'w').write(the_stdout)
        open(path.join(pdatadir, 'stderr.log'), 'w').write(the_stderr)

        if the_retcode == 0:
            return the_retcode
        else:
            sendnote(iconpath, program.name,
                     'Crashed' + '\n' 'exitcode: ' + str(the_retcode), 10)

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
                print(f"[{who}] STDERR: {line}", end="", file=stderr)
            else:
                the_stdout += line
                print(f"[{who}] STDOUT: {line}", end="")
    return the_stdout, the_stderr, p.wait()

def sendnote(iconpath, title, message, timeout):
    notification.notify(
        app_name=gettext(app.name),
        app_icon=iconpath,
        title=title,
        message=message,
        timeout=timeout
    )


@app.get('/favicon.ico')
def file_favicon():
    return send_from_directory(path.join(app.root_path, 'static'), 'pic/favicon.ico')

@app.get('/app.webmanifest')
def file_webmanifest():
    return render_template('app.webmanifest', appname=app.config['APPNAME'],
                           appdes=app.config['DESCRIPTION'], get_locale=get_locale)

@app.get('/serviceworker.js')
@cache_header(app.config['CACHE_DEFAULT_TIMEOUT'])
def file_serviceworker():
    response = make_response(render_template('js/sw.js'))
    response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    return etag(response)


if __name__ == '__main__':
    db.create_all()
    # 向 Config 表中插入默认配置项
    for name in config_names:
        if Config.query.filter_by(name=name).first() is None:
            config = Config(name=name, value='')
            db.session.add(config)
    db.session.commit()
    for program in Program.query.all():
        program_dir = path.join(resources_dir, str(program.id))
        if not path.exists(program_dir):
            makedirs(program_dir)
    app.run(host='::', port=2023, debug=True)
