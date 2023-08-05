# 小笔记

## 怎么更新翻译
运行 `update_i18n.sh`，或者：

```bash
pybabel extract -F babel.cfg -o messages.pot .

pybabel update -i messages.pot -d remotelauncher/translations
```

#### 编译翻译文件

```bash
pybabel compile -d remotelauncher/translations
```

#### 初始化zh翻译

```bash
pybabel init -i messages.pot -d remotelauncher/translations -l zh
```

## 自动生成requirements.txt

```bash
pipreqs . --encoding==utf8
```
