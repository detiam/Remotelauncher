from .app import *

__author__ = 'detiam'

db.create_all()
# 向 Config 表中插入默认配置项
for name in config_names:
    if Config.query.filter_by(name=name).first() is None:
        config = Config(name=name, value='')
        db.session.add(config)
db.session.commit()

# 如果程序没有对应文件夹，创建一个
for program in Program.query.all():
    program_dir = path.join(app.config['UPLOAD_FOLDER'], str(program.id))
    if not path.exists(program_dir):
        makedirs(program_dir)
