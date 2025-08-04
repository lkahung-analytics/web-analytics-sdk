// 时区测试专用脚本
class TimezoneTest {
    constructor() {
        this.testResults = [];
        this.analytics = null;
    }

    // 初始化分析SDK
    init() {
        if (typeof Analytics !== 'undefined') {
            this.analytics = Analytics;
            this.analytics.init({
                appId: 'timezone-test-001',
                endpoint: 'http://localhost:8080/collect',
                debug: true,
                isSPA: true
            });
            console.log('✅ Analytics SDK initialized for timezone testing');
        } else {
            console.error('❌ Analytics SDK not found');
        }
    }

    // 基础时区信息测试
    testBasicTimezoneInfo() {
        const now = new Date();
        const results = {
            testName: 'Basic Timezone Info',
            timestamp: now.toISOString(),
            localTime: now.toString(),
            utcTime: now.toUTCString(),
            timezoneOffset: now.getTimezoneOffset(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            passed: true
        };

        // 验证SDK是否正确捕获时区信息
        if (this.analytics) {
            const baseData = this.analytics.getBaseData();
            results.sdkTimezoneOffset = baseData.timezone_offset;
            results.sdkTimestamp = baseData.timestamp;
            
            // 检查一致性
            const offsetMatch = results.timezoneOffset === baseData.timezone_offset;
            results.passed = offsetMatch;
            results.details = `本地偏移: ${results.timezoneOffset}, SDK偏移: ${baseData.timezone_offset}, 匹配: ${offsetMatch}`;
        }

        this.testResults.push(results);
        this.logResult(results);
    }

    // 跨时区时间戳一致性测试
    testTimestampConsistency() {
        const testTimes = [];
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
            const jsTime = Date.now();
            const dateTime = new Date().getTime();
            const isoTime = new Date().toISOString();
            
            testTimes.push({
                iteration: i + 1,
                jsTime,
                dateTime,
                isoTime,
                difference: Math.abs(jsTime - dateTime)
            });
            
            // 小延迟避免时间完全相同
            this.sleep(10);
        }

        const maxDifference = Math.max(...testTimes.map(t => t.difference));
        const results = {
            testName: 'Timestamp Consistency',
            timestamp: new Date().toISOString(),
            testTimes,
            maxDifference,
            passed: maxDifference < 100, // 允许100ms的误差
            details: `最大时间差: ${maxDifference}ms`
        };

        this.testResults.push(results);
        this.logResult(results);
    }

    // 页面停留时间精度测试
    testDwellTimeAccuracy() {
        return new Promise((resolve) => {
            const testDuration = 3000; // 3秒测试
            const startTime = Date.now();
            
            if (this.analytics) {
                // 设置页面开始时间
                this.analytics.session.pageStartTime = startTime;
                
                setTimeout(() => {
                    // 模拟页面离开
                    this.analytics.trackPageLeave();
                    
                    // 检查记录的时长
                    setTimeout(() => {
                        const queue = this.analytics.eventQueue;
                        const actualDuration = Date.now() - startTime;
                        
                        let recordedDuration = null;
                        for (const event of queue) {
                            if (event.session_duration) {
                                recordedDuration = event.session_duration;
                                break;
                            }
                        }

                        const accuracy = recordedDuration ? 
                            Math.abs(actualDuration - recordedDuration) : null;
                        
                        const results = {
                            testName: 'Dwell Time Accuracy',
                            timestamp: new Date().toISOString(),
                            expectedDuration: testDuration,
                            actualDuration,
                            recordedDuration,
                            accuracy,
                            accuracyPercent: accuracy ? (1 - accuracy / actualDuration) * 100 : null,
                            passed: accuracy && accuracy < 500, // 允许500ms误差
                            details: `预期: ${testDuration}ms, 实际: ${actualDuration}ms, 记录: ${recordedDuration}ms`
                        };

                        this.testResults.push(results);
                        this.logResult(results);
                        resolve(results);
                    }, 100);
                }, testDuration);
            } else {
                const results = {
                    testName: 'Dwell Time Accuracy',
                    timestamp: new Date().toISOString(),
                    passed: false,
                    details: 'Analytics SDK not available'
                };
                this.testResults.push(results);
                resolve(results);
            }
        });
    }

    // 时区边界测试
    testTimezoneBoundaries() {
        const testCases = [
            { name: '午夜边界', hour: 0, minute: 0 },
            { name: '正午', hour: 12, minute: 0 },
            { name: '夏令时切换', hour: 2, minute: 0 },
            { name: '年末', hour: 23, minute: 59 }
        ];

        const results = {
            testName: 'Timezone Boundaries',
            timestamp: new Date().toISOString(),
            testCases: [],
            passed: true
        };

        testCases.forEach(testCase => {
            const now = new Date();
            const testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                    testCase.hour, testCase.minute, 0);
            
            const utcTime = testDate.toISOString();
            const localTime = testDate.toString();
            const offset = testDate.getTimezoneOffset();

            results.testCases.push({
                name: testCase.name,
                localTime,
                utcTime,
                offset,
                valid: !isNaN(testDate.getTime())
            });
        });

        this.testResults.push(results);
        this.logResult(results);
    }

    // 多时区模拟测试
    testMultipleTimezones() {
        const timezones = [
            { name: 'UTC', offset: 0 },
            { name: 'Beijing (UTC+8)', offset: -480 },
            { name: 'New York (UTC-5)', offset: 300 },
            { name: 'London (UTC+0)', offset: 0 },
            { name: 'Tokyo (UTC+9)', offset: -540 },
            { name: 'Sydney (UTC+10)', offset: -600 }
        ];

        const baseTime = Date.now();
        const results = {
            testName: 'Multiple Timezones Simulation',
            timestamp: new Date().toISOString(),
            baseTime,
            timezones: [],
            passed: true
        };

        timezones.forEach(tz => {
            // 计算该时区的本地时间
            const localTime = new Date(baseTime - tz.offset * 60000);
            const isoTime = localTime.toISOString();
            
            results.timezones.push({
                name: tz.name,
                offset: tz.offset,
                localTime: localTime.toString(),
                isoTime,
                timestamp: localTime.getTime()
            });
        });

        this.testResults.push(results);
        this.logResult(results);
    }

    // 性能测试
    testPerformance() {
        const iterations = 1000;
        const operations = [];

        // 测试Date.now()性能
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
            Date.now();
        }
        const end1 = performance.now();
        operations.push({ name: 'Date.now()', time: end1 - start1, perOp: (end1 - start1) / iterations });

        // 测试new Date().getTime()性能
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
            new Date().getTime();
        }
        const end2 = performance.now();
        operations.push({ name: 'new Date().getTime()', time: end2 - start2, perOp: (end2 - start2) / iterations });

        // 测试时区偏移获取性能
        const start3 = performance.now();
        for (let i = 0; i < iterations; i++) {
            new Date().getTimezoneOffset();
        }
        const end3 = performance.now();
        operations.push({ name: 'getTimezoneOffset()', time: end3 - start3, perOp: (end3 - start3) / iterations });

        const results = {
            testName: 'Performance Test',
            timestamp: new Date().toISOString(),
            iterations,
            operations,
            passed: operations.every(op => op.perOp < 1) // 每次操作应该小于1ms
        };

        this.testResults.push(results);
        this.logResult(results);
    }

    // 运行所有测试
    async runAllTests() {
        console.log('🚀 开始时区测试套件...');
        
        this.testBasicTimezoneInfo();
        this.testTimestampConsistency();
        await this.testDwellTimeAccuracy();
        this.testTimezoneBoundaries();
        this.testMultipleTimezones();
        this.testPerformance();

        this.generateReport();
    }

    // 生成测试报告
    generateReport() {
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const passRate = (passed / total * 100).toFixed(2);

        const report = {
            summary: {
                total,
                passed,
                failed: total - passed,
                passRate: `${passRate}%`,
                timestamp: new Date().toISOString()
            },
            environment: {
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                platform: navigator.platform
            },
            results: this.testResults
        };

        console.log('📊 测试报告:', report);
        
        // 在控制台显示摘要
        console.log(`\n=== 时区测试报告 ===`);
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${passed}`);
        console.log(`失败: ${total - passed}`);
        console.log(`通过率: ${passRate}%`);
        console.log(`时区: ${report.environment.timezone}`);
        console.log(`时区偏移: ${report.environment.timezoneOffset} 分钟`);

        // 保存到window对象供外部访问
        window.timezoneTestReport = report;
        
        return report;
    }

    // 辅助方法
    sleep(ms) {
        const start = Date.now();
        while (Date.now() - start < ms) {
            // 忙等待
        }
    }

    logResult(result) {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.details || 'OK'}`);
    }

    // 导出测试数据
    exportResults() {
        const data = JSON.stringify(window.timezoneTestReport || this.testResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timezone-test-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 自动运行测试的函数
window.runTimezoneTests = function() {
    const tester = new TimezoneTest();
    tester.init();
    return tester.runAllTests();
};

// 页面加载完成后提示
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('⏰ 时区测试脚本已加载');
        console.log('💡 使用 runTimezoneTests() 开始测试');
        console.log('💡 使用 window.timezoneTestReport 查看结果');
    });
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimezoneTest;
}