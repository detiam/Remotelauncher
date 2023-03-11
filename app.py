import os
from flask import Flask, redirect ,render_template, url_for, abort, send_from_directory, g, request
from flask_sqlalchemy import SQLAlchemy
from flask_babel import Babel, force_locale

app = Flask(__name__)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///programs.db'
app.config['LANGUAGES'] = {
    'en': 'English',
    'zh': '中文'
}

def get_locale():
    if 'lang' in request.cookies:
        return request.cookies.get("lang")
    else:
        return request.accept_languages.best_match(app.config['LANGUAGES'])

def get_timezone():
    user = getattr(g, 'user', None)
    if user is not None:
        return user.timezone

def configlocalizedname(config):
    # 烂到要死的解决方法
    return eval(''.join(['config.', get_locale(), '_name']))

babel = Babel(app, locale_selector=get_locale, timezone_selector=get_timezone)
db = SQLAlchemy(app)

class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    zh_name = db.Column(db.String(50), unique=True, nullable=False)
    en_name = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(100), nullable=False)

class Program(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(), unique=False, nullable=False)
    workdir = db.Column(db.String(), unique=False, nullable=False)
    prefix = db.Column(db.String(), unique=False, nullable=False)
    command = db.Column(db.String(), unique=False, nullable=False)

@app.route('/')
def index():
    # 渲染 index.html 模板文件，并将 programs, configs 变量传递给模板
    return render_template('index.html', languages=app.config['LANGUAGES'], get_locale=get_locale, configlocalizedname=configlocalizedname, programs=Program.query.all(), configs=Config.query.all())

@app.route('/favicon.png')
def favicon_png():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.png')

@app.route('/favicon.ico')
def favicon_ico():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico')

@app.route('/dummy-sw.js')
def sw():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'dummy-sw.js')

@app.route('/app.webmanifest')
def manifest():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'app.webmanifest')

@app.route('/detail/<int:program_id>', methods=['GET'])
def detail(program_id):
    return render_template('detail.html', program=Program.query.get_or_404(program_id))

@app.route('/config', methods=['POST'])
def config():
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
    return redirect(request.referrer)
    #return redirect(url_for('index'))

@app.route('/add', methods=['POST'])
def add_program():
    id = request.form['program_id']
    name = request.form['program_name']
    workdir = request.form['program_workdir']
    prefix = request.form['program_prefix']
    command = request.form['program_command']
    if id == '0':
        program = Program(name=name, workdir=workdir, prefix=prefix, command=command)
        db.session.add(program)
        db.session.commit()
        return redirect(request.referrer)
        #return redirect(url_for('index'))
    else:
        program=Program.query.get_or_404(id)
        program.name = name
        program.workdir = workdir
        program.prefix = prefix
        program.command = command
        db.session.commit()
        return redirect(request.referrer)
        #return redirect(url_for('detail', program_id=program.id))

@app.route('/delete/<int:program_id>', methods=['GET'])
def delete_program(program_id):
    program = Program.query.get_or_404(program_id)
    db.session.delete(program)
    db.session.commit()
    return redirect(request.referrer)
    #return redirect(url_for('index'))

@app.route('/launch/<int:program_id>', methods=['GET'])
def launch(program_id):
    program = Program.query.get_or_404(program_id)
    wideprefix = Config.query.filter_by(name='config_wideprefix').first()
    wideworkdir = Config.query.filter_by(name='config_wideworkdir').first()
    if program is None:
        abort(404, f"Program {program_id} not found.")
    command = " ".join([wideprefix.value, program.prefix, program.command])
    os.chdir(os.path.expandvars(program.workdir) or os.path.expandvars(wideworkdir.value))
    os.popen(command)
    return redirect(request.referrer)
    #return redirect(url_for('index'))

if __name__ == '__main__':
    db.create_all()
    # 向 Config 表中插入默认配置项
    default_config_names = ['config_wideprefix', 'config_wideworkdir']
    default_config_zh_names = ['全局前缀', '默认运行目录']
    default_config_en_names = ['Global prefix', 'Default working directory']
    for name, zh_name, en_name in zip(default_config_names, default_config_zh_names, default_config_en_names):
        config = Config.query.filter_by(name=name).first()
        if config:
            config.zh_name = zh_name
            config.en_name = en_name
        else:
            config = Config(name=name, zh_name=zh_name, en_name=en_name, value='')
            db.session.add(config)
    db.session.commit()
    app.run(host='localhost', port=2023, debug=False)