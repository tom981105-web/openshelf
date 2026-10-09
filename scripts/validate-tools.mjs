#!/usr/bin/env node
// Offline validator for the JSON file consumed by the public OpenShelf site.
import fs from 'node:fs';
import path from 'node:path';

export function validateTools(data) {
  const errors = [];
  if (!Array.isArray(data)) return ['tools.json must be an array'];
  const ids = new Set();
  const repositories = new Set();
  const required = ['id', 'name', 'description', 'category'];
  for (const [index, tool] of data.entries()) {
    const label = 'tools[' + index + ']';
    if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
      errors.push(label + ': expected an object'); continue;
    }
    for (const key of required) {
      if (typeof tool[key] !== 'string' || !tool[key].trim())
        errors.push(label + '.' + key + ': non-empty string required');
    }
    for (const key of ['tags', 'platforms']) {
      if (!Array.isArray(tool[key]) || tool[key].some(v => typeof v !== 'string'))
        errors.push(label + '.' + key + ': string array required');
    }
    if (typeof tool.id === 'string' && tool.id.trim()) {
      const id = tool.id.trim().toLowerCase();
      if (ids.has(id)) errors.push(label + '.id: duplicate "' + id + '"');
      ids.add(id);
    }
    if (typeof tool.github === 'string' && tool.github.trim()) {
      try {
        const url = new URL(tool.github);
        if (url.hostname.toLowerCase() === 'github.com') {
          const slug = url.pathname.split('/').filter(Boolean).join('/').toLowerCase().replace(/\\.git$/i, '');
          if (repositories.has(slug)) errors.push(label + '.github: duplicate GitHub repository "' + slug + '"');
          repositories.add(slug);
        }
      } catch { errors.push(label + '.github: invalid URL'); }
    }
    for (const field of ['free', 'openSource']) {
      if (field in tool && typeof tool[field] !== 'boolean')
        errors.push(label + '.' + field + ': boolean required when supplied');
    }
  }
  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const target = process.argv[2] || 'data/tools.json';
  try {
    const data = JSON.parse(fs.readFileSync(target, 'utf8'));
    const errors = validateTools(data);
    if (errors.length) {
      console.error('OpenShelf data validation failed (' + errors.length + '):');
      for (const error of errors.slice(0, 100)) console.error(' - ' + error);
      process.exitCode = 1;
    } else console.log('OpenShelf data valid: ' + data.length + ' tools');
  } catch (error) {
    console.error('Cannot validate ' + target + ': ' + error.message);
    process.exitCode = 1;
  }
}
