# 小笔记

### 怎么更新翻译

```bash
pybabel extract -F babel.cfg -o messages.pot .

pybabel update -i messages.pot -d translations
```

### 编译翻译文件

```bash
pybabel compile -d translations
```

### 初始化zh翻译

```bash
pybabel init -i messages.pot -d translations -l zh
```

### 自动生成requirements.txt

```bash
pipreqs . --encoding==utf8
```

### 现在的requirements.txt
```text
Flask==2.2.2
flask_babel==3.0.1
Flask_SQLAlchemy==2.5.1
SQLAlchemy==1.4.44
```
