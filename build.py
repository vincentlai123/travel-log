# 用法: python3 build.py  -> 把 /home/box/shared/旅遊日誌/data.json 加密成 data.enc.json
import json,os,base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
pw=open('/home/box/.config/travel-log-pass').read().strip().encode()
data=open('/home/box/shared/旅遊日誌/data.json','rb').read()
salt=os.urandom(16);iv=os.urandom(12)
key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=200000).derive(pw)
ct=AESGCM(key).encrypt(iv,data,None)
b=lambda x:base64.b64encode(x).decode()
json.dump({"salt":b(salt),"iv":b(iv),"ct":b(ct),"iter":200000},open('data.enc.json','w'))
print("ok",len(data))
