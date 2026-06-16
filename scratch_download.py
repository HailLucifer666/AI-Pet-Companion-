import urllib.request
import re

html = urllib.request.urlopen("https://quaternius.com/packs/medievalvillagemegakit.html").read().decode('utf-8', errors='ignore')
html = html.replace('"', "'")
links = re.findall(r"href='(.*?)'", html)

for l in links:
    if "drive.google.com" in l or "download" in l.lower() or ".zip" in l:
        print(l)
