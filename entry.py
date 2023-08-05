#!/bin/python3
from remotelauncher import uname, app
from asyncio import run
from hypercorn.config import Config as hypercornConfig
from hypercorn.asyncio import serve
from hypercorn.middleware import AsyncioWSGIMiddleware
from argparse import ArgumentParser

parser = ArgumentParser(
    prog=app.config['APPNAME'],
    description='Config and run programs from the web!'
)
parser.add_argument(
    '--debug',
    nargs='?',
    default='production',
    choices=['hypercorn', 'flask'],
    help='enable debug mode'
)
args = parser.parse_args()

hypercornconfig = hypercornConfig()
match uname().system:
    case 'Linux':
        hypercornconfig.bind = ["[::]:2023"]
    case _:
        hypercornconfig.bind = ["[::]:2023", "0.0.0.0:2023"]
    

if args.debug == 'flask':
    app.run(host='::', port=2023, debug=True)
elif args.debug == 'hypercorn' or args.debug == None:
    hypercornconfig.accesslog = '-'
    run(serve(AsyncioWSGIMiddleware(app, max_body_size=app.config['MAX_CONTENT_LENGTH']), hypercornconfig, mode='asgi'), debug=True)
else:
    run(serve(AsyncioWSGIMiddleware(app, max_body_size=app.config['MAX_CONTENT_LENGTH']), hypercornconfig, mode='asgi'))
