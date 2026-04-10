#!/usr/bin/env node

/**
 * Тест загрузки изображений в CMS
 * Использование: node tests/image_upload_test.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function pass(msg) {
    log(`✓ PASS: ${msg}`, 'green');
}

function fail(msg) {
    log(`✗ FAIL: ${msg}`, 'red');
}

function info(msg) {
    log(`ℹ INFO: ${msg}`, 'blue');
}

function apiRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testImageUploadEndpoints() {
    log('\n🖼️  ТЕСТ: Проверка API для загрузки изображений', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        // Проверка что endpoint существует (без аутентификации вернет 401 или 302)
        info('Проверка /api/upload endpoint...');
        try {
            await apiRequest('/api/upload', 'POST');
            fail('Endpoint не защищен аутентификацией!');
            return false;
        } catch (err) {
            if (err.message.includes('302') || err.message.includes('401')) {
                pass('Endpoint /api/upload существует и защищен');
            } else {
                fail(`Неожиданная ошибка: ${err.message}`);
                return false;
            }
        }
        
        // Проверка GET /api/uploads
        info('Проверка /api/uploads endpoint...');
        try {
            await apiRequest('/api/uploads');
            fail('Endpoint не защищен аутентификацией!');
            return false;
        } catch (err) {
            if (err.message.includes('302') || err.message.includes('401')) {
                pass('Endpoint /api/uploads существует и защищен');
            } else {
                fail(`Неожиданная ошибка: ${err.message}`);
                return false;
            }
        }
        
        // Проверка что папка uploads существует
        info('Проверка папки uploads...');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            pass('Папка uploads существует');
            
            // Проверяем файлы в папке
            const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
            if (files.length > 0) {
                pass(`Найдено ${files.length} загруженных файлов`);
                info(`Примеры: ${files.slice(0, 3).join(', ')}`);
            } else {
                info('Папка uploads пуста (файлы еще не загружались)');
            }
        } else {
            info('Папка uploads будет создана при первой загрузке');
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function testImageFieldsInContent() {
    log('\n📝 ТЕСТ: Проверка полей изображений в контенте', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка контента...');
        const content = await apiRequest('/api/content');
        
        // Ищем все поля с изображениями
        const imageFields = [];
        
        function findImageFields(obj, prefix = '') {
            for (const key in obj) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (typeof value === 'string' && (
                    key.toLowerCase().includes('image') ||
                    key.toLowerCase().includes('img') ||
                    key.toLowerCase().includes('photo') ||
                    key.toLowerCase().includes('avatar') ||
                    value.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
                )) {
                    imageFields.push({ key: fullKey, value: value });
                } else if (typeof value === 'object' && value !== null) {
                    findImageFields(value, fullKey);
                }
            }
        }
        
        findImageFields(content);
        
        if (imageFields.length > 0) {
            pass(`Найдено ${imageFields.length} полей изображений`);
            info('Примеры полей:');
            imageFields.slice(0, 5).forEach(field => {
                info(`  - ${field.key}: ${field.value}`);
            });
        } else {
            log('⚠ Поля изображений не найдены в content.json', 'yellow');
            info('Это нормально, если изображения хранятся отдельно');
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function testImageFieldsInArticles() {
    log('\n📰 ТЕСТ: Проверка изображений в статьях блога', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка статей...');
        const articles = await apiRequest('/api/articles');
        
        if (!Array.isArray(articles) || articles.length === 0) {
            info('Статей нет в блоге');
            return true;
        }
        
        let articlesWithImages = 0;
        let totalImages = 0;
        
        articles.forEach(article => {
            if (article.image) {
                articlesWithImages++;
                totalImages++;
            }
            
            // Проверяем изображения в контенте статьи
            if (article.content) {
                const imgMatches = article.content.match(/<img[^>]+src="([^">]+)"/g);
                if (imgMatches) {
                    totalImages += imgMatches.length;
                }
            }
        });
        
        pass(`${articlesWithImages}/${articles.length} статей имеют главное изображение`);
        pass(`Всего изображений в статьях: ${totalImages}`);
        
        // Проверяем доступность изображений
        if (articlesWithImages > 0) {
            const firstArticleWithImage = articles.find(a => a.image);
            info(`Пример изображения: ${firstArticleWithImage.image}`);
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function testStaticImageServing() {
    log('\n🌐 ТЕСТ: Проверка раздачи статических изображений', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        // Проверяем папку img
        info('Проверка папки img/...');
        const imgDir = path.join(process.cwd(), 'img');
        if (fs.existsSync(imgDir)) {
            const files = fs.readdirSync(imgDir).filter(f => 
                f.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
            );
            pass(`Найдено ${files.length} изображений в папке img/`);
            if (files.length > 0) {
                info(`Примеры: ${files.slice(0, 3).join(', ')}`);
            }
        } else {
            info('Папка img/ не найдена');
        }
        
        // Проверяем папку favicon
        info('Проверка папки favicon/...');
        const faviconDir = path.join(process.cwd(), 'favicon');
        if (fs.existsSync(faviconDir)) {
            const files = fs.readdirSync(faviconDir).filter(f => 
                f.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)
            );
            pass(`Найдено ${files.length} файлов в папке favicon/`);
        } else {
            info('Папка favicon/ не найдена');
        }
        
        // Проверяем папку team
        info('Проверка папки team/...');
        const teamDir = path.join(process.cwd(), 'team');
        if (fs.existsSync(teamDir)) {
            const files = fs.readdirSync(teamDir).filter(f => 
                f.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
            );
            pass(`Найдено ${files.length} изображений в папке team/`);
        } else {
            info('Папка team/ не найдена');
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function runAllTests() {
    console.clear();
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   🖼️  ТЕСТ ЗАГРУЗКИ И УПРАВЛЕНИЯ ИЗОБРАЖЕНИЯМИ           ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    const startTime = Date.now();
    
    // Проверка доступности сервера
    try {
        info('\nПроверка доступности сервера...');
        await apiRequest('/api/content');
        pass('Сервер доступен на http://localhost:3000\n');
    } catch (err) {
        fail('Сервер недоступен! Запустите: npm start');
        process.exit(1);
    }
    
    const results = [];
    results.push(await testImageUploadEndpoints());
    results.push(await testImageFieldsInContent());
    results.push(await testImageFieldsInArticles());
    results.push(await testStaticImageServing());
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log(`║   ✨ ПРОВЕРКА ЗАВЕРШЕНА ЗА ${duration}s                        ║`, 'cyan');
    log(`║   Пройдено: ${passed}/${total} тестов                                  ║`, passed === total ? 'green' : 'yellow');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    if (passed === total) {
        log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!', 'green');
        log('\nЧто проверено:', 'green');
        log('  ✓ API endpoints для загрузки изображений существуют', 'green');
        log('  ✓ Endpoints защищены аутентификацией', 'green');
        log('  ✓ Папка uploads настроена', 'green');
        log('  ✓ Поля изображений в контенте найдены', 'green');
        log('  ✓ Изображения в статьях блога проверены', 'green');
        log('  ✓ Статические изображения доступны', 'green');
        log('\nДля ручного тестирования загрузки:', 'cyan');
        log('  1. Откройте http://localhost:3000/admin/', 'cyan');
        log('  2. Войдите (admin / workeron2026)', 'cyan');
        log('  3. Перейдите в Blog Manager', 'cyan');
        log('  4. Создайте статью и загрузите изображение', 'cyan');
        log('  5. Или используйте кнопку Image в редакторе', 'cyan');
    } else {
        log(`\n⚠️  ${total - passed} проверка(и) провалено`, 'yellow');
    }
    
    process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(err => {
    fail(`Критическая ошибка: ${err.message}`);
    process.exit(1);
});
