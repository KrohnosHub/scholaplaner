#!/usr/bin/env python3
"""Baut index.html aus src/. Aufruf: python3 build.py  (Version wird in sw.js und index.html eingetragen)"""
import re,sys,glob
v=open('VERSION').read().strip()
s=open('src/shell.html').read()
def sub(tag,val):
    global s
    assert tag in s
    s=s.replace(tag,val.replace('\\','\\\\') if False else val)
sub('/*CSS*/',open('src/style.css').read())
sub('<!--BODY-->',open('src/body.html').read())
sub('/*BOOT*/',open('src/boot.js').read())
main=''.join(open(f).read() for f in sorted(glob.glob('src/js/*.js')))  # Reihenfolge = Dateinamen (00-, 10-, …)
assert '</script' not in main.lower()
sub('/*MAIN*/',main)
s=s.replace('<!--BUILD-->',v)
s=s.replace('<title>','<!-- Build '+v+' -->\n<title>',1)
open('index.html','w').write(s)
sw=open('sw.js').read()
sw=re.sub(r"const CACHE='[^']*'","const CACHE='scholaplaner-v"+v+"'",sw)
open('sw.js','w').write(sw)
print('index.html gebaut, Build',v,len(s)//1024,'KB')
