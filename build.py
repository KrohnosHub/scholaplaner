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
sub('/*BOOT*/',open('src/gd-core.js').read()+open('src/boot.js').read())  # gd-core: gemeinsamer Drive-Kern mit Notator
main=''.join(open(f).read() for f in sorted(glob.glob('src/js/*.js')))  # Reihenfolge = Dateinamen (00-, 10-, …)
assert '</script' not in main.lower()
sub('/*MAIN*/',main)
s=s.replace('<!--BUILD-->',v)
# CSP: Hashes aller Inline-Skripte (auch #main, das boot.js als Skript einsetzt) in die Policy eintragen
import hashlib,base64
inl=[m.group(1) for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>',s)]
hs=' '.join("'sha256-"+base64.b64encode(hashlib.sha256(x.encode('utf-8')).digest()).decode()+"'" for x in inl)
assert s.count('CSP_SCRIPT_HASHES')==1
s=s.replace('CSP_SCRIPT_HASHES',hs)
s=s.replace('<title>','<!-- Build '+v+' -->\n<title>',1)
open('index.html','w',encoding='utf-8').write(s)
sw=open('sw.js').read()
sw=re.sub(r"const CACHE='[^']*'","const CACHE='scholaplaner-v"+v+"'",sw)
open('sw.js','w').write(sw)
print('index.html gebaut, Build',v,len(s)//1024,'KB')
