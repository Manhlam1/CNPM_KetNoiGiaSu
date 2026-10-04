#!/usr/bin/env python3
"""Sinh Postman collection từ Swagger của backend đang chạy.

Cách dùng (backend đang chạy ở cổng 9090):
    python3 scripts/gen-postman.py
Kết quả: docs/openapi.json và docs/postman/TutorHub.postman_collection.json
"""
import json, re, urllib.request

spec = json.load(urllib.request.urlopen('http://localhost:9090/api/docs-json'))
json.dump(spec, open('docs/openapi.json', 'w'), ensure_ascii=False, indent=2)
schemas = spec.get('components', {}).get('schemas', {})

def example(schema, depth=0):
    if depth > 4 or not schema: return None
    if '$ref' in schema: return example(schemas[schema['$ref'].split('/')[-1]], depth + 1)
    if 'example' in schema: return schema['example']
    if 'enum' in schema: return schema['enum'][0]
    t = schema.get('type')
    if t == 'object' or 'properties' in schema:
        return {k: example(v, depth + 1) for k, v in schema.get('properties', {}).items()}
    if t == 'array':
        e = example(schema.get('items', {}), depth + 1)
        return [e] if e is not None else []
    return {'string': '', 'integer': 1, 'number': 1, 'boolean': True}.get(t)

folders = {}
for path, ops in spec['paths'].items():
    for method, op in ops.items():
        tag = (op.get('tags') or ['Khác'])[0]
        url_path = re.sub(r'\{(\w+)\}', r':\1', path)
        segs = [s for s in url_path.split('/') if s]
        req = {'method': method.upper(), 'header': [], 'url': {'raw': '{{baseUrl}}' + url_path, 'host': ['{{baseUrl}}'], 'path': segs,
               'variable': [{'key': p[1:], 'value': '1'} for p in segs if p.startswith(':')]}}
        q = [p for p in op.get('parameters', []) if p.get('in') == 'query']
        if q: req['url']['query'] = [{'key': p['name'], 'value': '', 'disabled': True} for p in q]
        req['auth'] = {'type': 'bearer', 'bearer': [{'key': 'token', 'value': '{{token}}', 'type': 'string'}]} if op.get('security') else {'type': 'noauth'}
        rb = op.get('requestBody', {}).get('content', {})
        if 'application/json' in rb:
            req['header'].append({'key': 'Content-Type', 'value': 'application/json'})
            body = example(rb['application/json'].get('schema'))
            if path == '/api/auth/login': body = {'email': 'hocvien@tutorhub.vn', 'password': '123456'}
            req['body'] = {'mode': 'raw', 'raw': json.dumps(body, ensure_ascii=False, indent=2), 'options': {'raw': {'language': 'json'}}}
        elif 'multipart/form-data' in rb:
            req['body'] = {'mode': 'formdata', 'formdata': [{'key': 'file', 'type': 'file', 'src': ''}]}
        item = {'name': f'{method.upper()} {path}', 'request': req}
        if path == '/api/auth/login':
            item['event'] = [{'listen': 'test', 'script': {'type': 'text/javascript', 'exec': ["const d = pm.response.json();", "if (d.success) pm.collectionVariables.set('token', d.data.token);"]}}]
        folders.setdefault(tag, []).append(item)

col = {'info': {'name': 'TutorHub API', 'description': 'Sinh tự động từ Swagger. Gọi POST /api/auth/login trước (mật khẩu tài khoản mẫu: 123456), token tự lưu vào {{token}}.',
                'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
       'variable': [{'key': 'baseUrl', 'value': 'http://localhost:9090'}, {'key': 'token', 'value': ''}],
       'item': [{'name': k, 'item': v} for k, v in sorted(folders.items())]}
json.dump(col, open('docs/postman/TutorHub.postman_collection.json', 'w'), ensure_ascii=False, indent=2)
print(f'{sum(len(v) for v in folders.values())} request trong {len(folders)} nhóm')
