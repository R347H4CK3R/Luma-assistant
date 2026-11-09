import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/ui',use:{viewport:{width:390,height:844},launchOptions:{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']}},webServer:{command:'npx vite preview --host 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:true}});
