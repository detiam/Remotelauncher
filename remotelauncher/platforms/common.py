from plyer import notification, filechooser

APPNAME='RemoteLauncher'
CONFIGNAMES = [
    'config_wideprefix',
    'config_wideworkdirpath',
    'config_achipath',
    'config_downconfpath'
]

def askdirectory():
    ret = filechooser.choose_dir()
    if ret:
        return ret[0]
    else:
        return False

def notify(*, title='', message='', app_name=APPNAME, app_icon='',
            timeout=20, ticker='', toast=False, hints={}):
    return notification.notify(
            title=title, message=message,
            app_icon=app_icon, app_name=app_name,
            timeout=timeout, ticker=ticker, toast=toast, hints=hints)
