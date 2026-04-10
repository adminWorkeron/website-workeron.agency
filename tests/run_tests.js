#!/usr/bin/env node

/**
 * Workeron.ai CMS - Автоматический запуск тестов из командной строки
 * 
 * Использование: node tests/run_tests.js
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

function apiRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
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
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function test1_TextEditing() {
    log('\n📝 ТЕСТ 1: Редактирование текстов', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка текущего контента...');
        const originalContent = await apiRequest('/api/content');
        pass(`Загружено ${Object.keys(originalContent).length} текстовых элементов`);
        
        info('Изменение заголовка Hero секции...');
        const testText = `Test Hero Title ${Date.now()}`;
        const updatedContent = { ...originalContent };
        updatedContent['hero.title'] = testText;
        
        await apiRequest('/api/content', 'POST', updatedContent);
        pass('Текст успешно сохранен через API');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyContent = await apiRequest('/api/content');
        if (verifyContent['hero.title'] === testText) {
            pass('Изменения подтверждены в базе данных');
        } else {
            throw new Error('Текст не сохранился корректно');
        }
        
        info('Откат изменений...');
        await apiRequest('/api/content', 'POST', originalContent);
        pass('Оригинальный контент восстановлен');
        
        info('Проверка наличия всех ключевых текстовых полей...');
        const requiredFields = [
            'hero.title',
            'hero.subtitle',
            'hero.cta',
            'services.title',
            'about.title',
            'team.title',
            'blog.title',
            'contact.title'
        ];
        
        const missingFields = requiredFields.filter(field => !(field in originalContent));
        
        if (missingFields.length === 0) {
            pass(`Все ${requiredFields.length} обязательных полей присутствуют`);
        } else {
            log(`⚠ Отсутствуют поля: ${missingFields.join(', ')}`, 'yellow');
        }
        
        return true;
    } catch (err) {
        fail(err.message);
        return false;
    }
}

async function test2_ImageEditing() {
    log('\n🖼️  ТЕСТ 2: Редактирование изображений', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка текущих изображений...');
        const content = await apiRequest('/api/content');
        
        const imageFields = Object.keys(content).filter(key => 
            key.includes('.image') || key.includes('.img') || key.includes('.photo')
        );
        
        pass(`Найдено ${imageFields.length} полей изображений`);
        
        const keyImages = [
            'services.card1.image',
            'services.card2.image',
            'services.card3.image',
            'services.card4.image',
            'services.card5.image'
        ];
        
        let foundImages = 0;
        keyImages.forEach(img => {
            if (content[img]) {
                foundImages++;
                info(`  ✓ ${img}: ${content[img]}`);
            }
        });
        
        pass(`${foundImages}/${keyImages.length} ключевых изображений найдено`);
        
        info('Тест изменения пути изображения...');
        const originalImage = content['services.card1.image'];
        const testImage = 'img/test_image.png';
        
        content['services.card1.image'] = testImage;
        await apiRequest('/api/content', 'POST', content);
        
        const verify = await apiRequest('/api/content');
        if (verify['services.card1.image'] === testImage) {
            pass('Путь изображения успешно изменен');
        }
        
        content['services.card1.image'] = originalImage;
        await apiRequest('/api/content', 'POST', content);
        pass('Оригинальное изображение восстановлено');
        
        return true;
    } catch (err) {
        fail(err.message);
        return false;
    }
}

async function test3_FormSettings() {
    log('\n📧 ТЕСТ 3: Настройки формы обратной связи', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    try {
        info('Загрузка настроек формы...');
        const settings = await apiRequest('/api/settings');
        pass('Настройки загружены');
        
        if (settings.recipientEmail) {
            pass(`Email получателя: ${settings.recipientEmail}`);
        } else {
            log('⚠ Email получателя не настроен', 'yellow');
        }
        
        info('Тест изменения email получателя...');
        const originalEmail = settings.recipientEmail;
        const testEmail = 'test@workeron.ai';
        
        settings.recipientEmail = testEmail;
        await apiRequest('/api/settings', 'POST', settings);
        
        const verify = await apiRequest('/api/settings');
        if (verify.recipientEmail === testEmail) {
            pass('Email успешно изменен');
        }
        
        settings.recipientEmail = originalEmail;
        await apiRequest('/api/settings', 'POST', settings);
        pass('Оригинальный email восстановлен');
        
        if (settings.formTexts) {
            const formFields = Object.keys(settings.formTexts);
            pass(`Найдено ${formFields.length} настраиваемых текстов формы`);
        }
        
        return true;
    } catch (err) {
        fail(err.message);
        return false;
    }
}

async function test4_BlogManagement() {
    log('\n📰 ТЕСТ 4: Управление блогом (CRUD)', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    let testArticleId = null;
    
    try {
        // CREATE
        info('CREATE: Создание тестовой статьи...');
        const newArticle = {
            title: `Test Article ${Date.now()}`,
            slug: `test-article-${Date.now()}`,
            excerpt: 'This is a test article created by automated tests',
            content: '<h2>Test Content</h2><p>This is test content with <strong>HTML</strong> formatting.</p>',
            category: 'Testing',
            author: 'Test Bot',
            image: 'img/test.png',
            date: new Date().toISOString()
        };
        
        const createResponse = await apiRequest('/api/articles', 'POST', newArticle);
        testArticleId = createResponse.id;
        pass(`Статья создана с ID: ${testArticleId}`);
        
        // READ
        info('READ: Проверка созданной статьи...');
        const articles = await apiRequest('/api/articles');
        const foundArticle = articles.find(a => a.id === testArticleId);
        
        if (foundArticle && foundArticle.title === newArticle.title) {
            pass('Статья найдена в списке');
        } else {
            throw new Error('Созданная статья не найдена');
        }
        
        // UPDATE
        info('UPDATE: Обновление статьи...');
        const updatedTitle = `Updated Test Article ${Date.now()}`;
        foundArticle.title = updatedTitle;
        
        await apiRequest(`/api/articles/${testArticleId}`, 'PUT', foundArticle);
        pass('Статья обновлена');
        
        const articlesAfterUpdate = await apiRequest('/api/articles');
        const verifyUpdate = articlesAfterUpdate.find(a => a.id === testArticleId);
        
        if (verifyUpdate.title === updatedTitle) {
            pass('Изменения подтверждены');
        } else {
            throw new Error('Обновление не применилось');
        }
        
        // DELETE
        info('DELETE: Удаление тестовой статьи...');
        await apiRequest(`/api/articles/${testArticleId}`, 'DELETE');
        pass('Статья удалена');
        
        const articlesAfterDelete = await apiRequest('/api/articles');
        const shouldNotExist = articlesAfterDelete.find(a => a.id === testArticleId);
        
        if (!shouldNotExist) {
            pass('Удаление подтверждено');
        } else {
            throw new Error('Статья не была удалена');
        }
        
        info('Проверка всех статей в блоге...');
        const allArticles = await apiRequest('/api/articles');
        pass(`Всего статей в блоге: ${allArticles.length}`);
        
        allArticles.forEach((article, index) => {
            info(`  ${index + 1}. "${article.title}" (${article.category})`);
        });
        
        return true;
    } catch (err) {
        fail(err.message);
        
        if (testArticleId) {
            try {
                await apiRequest(`/api/articles/${testArticleId}`, 'DELETE');
                info('Тестовая статья удалена при cleanup');
            } catch (cleanupErr) {
                log('⚠ Не удалось удалить тестовую статью', 'yellow');
            }
        }
        
        return false;
    }
}

async function test5_APIEndpoints() {
    log('\n🔄 ТЕСТ 5: Проверка API endpoints', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const endpoints = [
        '/api/content',
        '/api/settings',
        '/api/articles',
        '/articles.js'
    ];
    
    let allPassed = true;
    
    for (const endpoint of endpoints) {
        try {
            await apiRequest(endpoint);
            pass(`${endpoint} доступен`);
        } catch (err) {
            fail(`${endpoint} недоступен: ${err.message}`);
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function runAllTests() {
    console.clear();
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   🚀 WORKERON.AI CMS - АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ       ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    const startTime = Date.now();
    const results = [];
    
    // Проверка доступности сервера
    try {
        info('\nПроверка доступности сервера...');
        await apiRequest('/api/content');
        pass('Сервер доступен на http://localhost:3000');
    } catch (err) {
        fail('Сервер недоступен! Запустите: npm start');
        process.exit(1);
    }
    
    results.push(await test1_TextEditing());
    results.push(await test2_ImageEditing());
    results.push(await test3_FormSettings());
    results.push(await test4_BlogManagement());
    results.push(await test5_APIEndpoints());
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log(`║   ✨ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ЗА ${duration}s                     ║`, 'cyan');
    log(`║   Пройдено: ${passed}/${total} тестов                                  ║`, passed === total ? 'green' : 'yellow');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    if (passed === total) {
        log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!', 'green');
        log('CMS полностью функционален и готов к использованию.', 'green');
    } else {
        log(`\n⚠️  ${total - passed} тест(ов) провалено`, 'yellow');
        log('Проверьте логи выше для деталей.', 'yellow');
    }
    
    process.exit(passed === total ? 0 : 1);
}

// Запуск
runAllTests().catch(err => {
    fail(`Критическая ошибка: ${err.message}`);
    process.exit(1);
});
