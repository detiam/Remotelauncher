###小笔记，怎么更新翻译
`pybabel extract -F babel.cfg -o messages.pot .`
`pybabel update -i messages.pot -d translations`
###编译翻译文件
`pybabel compile -d translations`
###初始化zh翻译
`pybabel init -i messages.pot -d translations -l zh`
###生成requirements.txt
`pipreqs . --encoding==utf8`

<br\>
Flask==2.2.2
flask_babel==3.0.1
Flask_SQLAlchemy==2.5.1
SQLAlchemy==1.4.44
