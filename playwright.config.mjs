import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./browser-tests',use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium'},retries:0,workers:1,reporter:'list'});
