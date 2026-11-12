#!/usr/bin/env python3
"""Prüft bei einem Pull Request, dass die Build-Nummer (VERSION) höher ist als auf dem Ziel-Branch.
Aufruf: python3 tools/check-version.py [Ziel-Ref, Standard origin/main]
Nur relevant, wenn index.html geändert wurde; sonst wird nichts verlangt."""
import subprocess, sys
base = sys.argv[1] if len(sys.argv) > 1 else 'origin/main'
def show(path):
    try:
        return subprocess.run(['git', 'show', base + ':' + path], capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        sys.exit('Ziel-Branch ' + base + ' nicht gefunden (git fetch origin main?)')
if show('index.html') == open('index.html', encoding='utf-8').read():
    print('index.html unverändert – keine neue Build-Nummer nötig'); sys.exit(0)
v_head, v_base = int(open('VERSION').read().strip()), int(show('VERSION').strip())
print('Build: PR', v_head, '| ' + base, v_base)
if v_head <= v_base:
    print('::error::VERSION muss höher sein als auf ' + base + ' (' + str(v_base) + '). '
          'Vermutlich wurde main inzwischen weiterentwickelt: Branch auf main bringen, VERSION erhöhen, python3 build.py.')
    sys.exit(1)
print('ok')
