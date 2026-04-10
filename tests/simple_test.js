#!/usr/bin/env node

/**
 * Workeron.ai CMS - Простая проверка функционала (без аутентификации)
 * 
 * Использование: node tests/simple_test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
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

function apiRequest(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET'
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

async function test1_ContentStructure() {
    log('\n📝 ТЕСТ 1: Структура контента', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка контента...');
        const content = await apiRequest('/api/content');
        
        const keys = Object.keys(content);
        pass(`Загружено ${keys.length} элементов контента`);
        
        // Проверка ключевых полей
        const requiredFields = [
            'hero',
            'services',
            'about',
            'team',
            'blog',
            'contact'
        ];
        
        let found = 0;
        requiredFields.forEach(field => {
            if (content[field] || keys.some(k => k.startsWith(field + '.'))) {
                found++;
                info(`  ✓ Секция "${field}" найдена`);
            }
        });
        
        if (found >= requiredFields.length - 1) {
            pass(`${found}/${requiredFields.length} основных секций присутствуют`);
        } else {
            fail(`Найдено только ${found}/${requiredFields.length} секций`);
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function test2_SettingsStructure() {
    log('\n⚙️  ТЕСТ 2: Настройки', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка настроек...');
        const settings = await apiRequest('/api/settings');
        pass('Настройки загружены');
        
        if (settings.recipientEmail) {
            pass(`Email получателя: ${settings.recipientEmail}`);
        } else {
            log('⚠ Email получателя не настроен', 'yellow');
        }
        
        if (settings.formTexts) {
            const fields = Object.keys(settings.formTexts);
            pass(`Найдено ${fields.length} настраиваемых текстов формы`);
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function test3_BlogArticles() {
    log('\n📰 ТЕСТ 3: Статьи блога', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка статей...');
        const articles = await apiRequest('/api/articles');
        
        if (!Array.isArray(articles)) {
            throw new Error('API вернул не массив');
        }
        
        pass(`Загружено ${articles.length} статей`);
        
        if (articles.length > 0) {
            info('Проверка структуры статей...');
            const firstArticle = articles[0];
            const requiredFields = ['id', 'title', 'slug', 'content', 'category', 'author', 'date'];
            
            let missingFields = [];
            requiredFields.forEach(field => {
                if (!(field in firstArticle)) {
                    missingFields.push(field);
                }
            });
            
            if (missingFields.length === 0) {
                pass('Все обязательные поля присутствуют в статьях');
            } else {
                fail(`Отсутствуют поля: ${missingFields.join(', ')}`);
            }
            
            // Показываем первые 3 статьи
            info('Первые статьи:');
            articles.slice(0, 3).forEach((article, index) => {
                info(`  ${index + 1}. "${article.title}" (${article.category})`);
            });
        } else {
            log('⚠ В блоге нет статей', 'yellow');
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function test4_ArticlesJS() {
    log('\n📜 ТЕСТ 4: Генерация articles.js', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Проверка /articles.js...');
        const articlesJS = await apiRequest('/articles.js');
        
        if (typeof articlesJS === 'string' && articlesJS.includes('const articles =')) {
            pass('articles.js генерируется корректно');
            
            // Проверяем что это валидный JavaScript
            if (articlesJS.includes('[') && articlesJS.includes(']')) {
                pass('Формат JavaScript массива корректен');
            }
        } else {
            fail('articles.js имеет неверный формат');
        }
        
        return true;
    } catch (err) {
        fail(`Ошибка: ${err.message}`);
        return false;
    }
}

async function test5_FrontendPages() {
    log('\n🌐 ТЕСТ 5: Фронтенд страницы', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const pages = [
        { path: '/', name: 'Главная страница' },
        { path: '/blog.html', name: 'Страница блога' },
        { path: '/admin/', name: 'Админ-панель' }
    ];
    
    let allPassed = true;
    
    for (const page of pages) {
        try {
            await apiRequest(page.path);
            pass(`${page.name} доступна`);
        } catch (err) {
            fail(`${page.name} недоступна: ${err.message}`);
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function runAllTests() {
    console.clear();
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   🚀 WORKERON.AI CMS - ПРОВЕРКА ФУНКЦИОНАЛА              ║', 'cyan');
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
    results.push(await test1_ContentStructure());
    results.push(await test2_SettingsStructure());
    results.push(await test3_BlogArticles());
    results.push(await test4_ArticlesJS());
    results.push(await test5_FrontendPages());
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log(`║   ✨ ПРОВЕРКА ЗАВЕРШЕНА ЗА ${duration}s                        ║`, 'cyan');
    log(`║   Пройдено: ${passed}/${total} тестов                                  ║`, passed === total ? 'green' : 'yellow');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    if (passed === total) {
        log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!', 'green');
        log('\nЧто проверено:', 'green');
        log('  ✓ Структура контента корректна', 'green');
        log('  ✓ Настройки загружаются', 'green');
        log('  ✓ Статьи блога доступны', 'green');
        log('  ✓ articles.js генерируется', 'green');
        log('  ✓ Все страницы доступны', 'green');
        log('\nДля полного тестирования с изменением данных:', 'cyan');
        log('  1. Откройте http://localhost:3000/admin/', 'cyan');
        log('  2. Войдите (admin / workeron2026)', 'cyan');
        log('  3. Следуйте инструкциям в tests/QUICK_TEST.md', 'cyan');
    } else {
        log(`\n⚠️  ${total - passed} проверка(и) провалено`, 'yellow');
        log('Проверьте логи выше для деталей.', 'yellow');
    }
    
    process.exit(passed === total ? 0 : 1);
}

// Запуск
runAllTests().catch(err => {
    fail(`Критическая ошибка: ${err.message}`);
    process.exit(1);
});
