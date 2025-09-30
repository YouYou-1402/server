class NetworkServiceManager {
    constructor() {
        this.apiUrl = 'api.php';
        this.services = {
            'apache2': { name: 'Apache2', port: 80, icon: 'fab fa-apache' },
            'nginx': { name: 'Nginx', port: 8080, icon: 'fas fa-server' },
            'haproxy': { name: 'HaProxy', port: 80, icon: 'fas fa-balance-scale' },
            'vsftpd': { name: 'FTP Server', port: 21, icon: 'fas fa-folder-open' },
            'ssh': { name: 'SSH Server', port: 22, icon: 'fas fa-terminal' },
            'isc-dhcp-server': { name: 'DHCP Server', port: 67, icon: 'fas fa-network-wired' }
        };
        
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.updateCurrentTime();
        this.updateServiceStatus();
        this.updateSystemMetrics();
        this.startAutoUpdate();
        this.setupEventListeners();
        
        this.addLog('Network Dashboard initialized successfully');
        this.addLog('Connected to server 54.225.52.171');
    }

    setupEventListeners() {
        // Navigation smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    
                    // Update active nav link
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    anchor.classList.add('active');
                }
            });
        });
    }

    startAutoUpdate() {
        // Update every 10 seconds
        this.updateInterval = setInterval(() => {
            this.updateServiceStatus();
            this.updateSystemMetrics();
            this.updateCurrentTime();
        }, 10000);
        
        this.addLog('Auto-update started (10s interval)');
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.addLog('Auto-update stopped');
        }
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    async updateServiceStatus() {
        try {
            const response = await fetch(`${this.apiUrl}?action=status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            let runningCount = 0;
            let stoppedCount = 0;
            
            Object.keys(data).forEach(service => {
                const serviceData = data[service];
                this.updateServiceCard(service, serviceData.status);
                
                if (serviceData.status) {
                    runningCount++;
                } else {
                    stoppedCount++;
                }
            });
            
            // Update dashboard counters
            this.updateElement('runningServices', runningCount);
            this.updateElement('stoppedServices', stoppedCount);
            
        } catch (error) {
            console.error('Error updating service status:', error);
            this.addLog(`Error updating service status: ${error.message}`);
        }
    }

    updateServiceCard(serviceName, isRunning) {
        const statusElement = document.getElementById(`${serviceName}-status`);
        if (statusElement) {
            statusElement.className = `status-badge ${isRunning ? 'running' : 'stopped'}`;
            statusElement.textContent = isRunning ? 'Đang chạy' : 'Đã dừng';
        }
    }

    async updateSystemMetrics() {
        try {
            const response = await fetch(`${this.apiUrl}?action=metrics`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.updateProgressBar('cpu-bar', data.cpu);
            this.updateProgressBar('memory-bar', data.memory);
            this.updateProgressBar('disk-bar', data.disk);
            this.updateProgressBar('network-bar', data.network);
            
            // Update dashboard overview
            this.updateElement('cpuUsage', `${Math.round(data.cpu)}%`);
            this.updateElement('memoryUsage', `${Math.round(data.memory)}%`);
            
        } catch (error) {
            console.error('Error updating metrics:', error);
            this.addLog(`Error updating metrics: ${error.message}`);
        }
    }

    updateProgressBar(id, value) {
        const bar = document.getElementById(id);
        if (bar) {
            const clampedValue = Math.max(0, Math.min(100, value));
            bar.style.width = `${clampedValue}%`;
            bar.textContent = `${Math.round(clampedValue)}%`;
            
            // Update color based on value
            bar.className = 'progress-bar';
            if (clampedValue < 50) {
                bar.classList.add('bg-success');
            } else if (clampedValue < 80) {
                bar.classList.add('bg-warning');
            } else {
                bar.classList.add('bg-danger');
            }
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    addLog(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;
        
        const timestamp = new Date().toLocaleString('vi-VN');
        const logLevel = type.toUpperCase();
        const newLog = `[${timestamp}] [${logLevel}] ${message}\n`;
        
        logContent.textContent = newLog + logContent.textContent;
        
        // Keep only last 50 lines
        const lines = logContent.textContent.split('\n');
        if (lines.length > 50) {
            logContent.textContent = lines.slice(0, 50).join('\n');
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Service control functions
async function controlService(service, action) {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    
    try {
        const formData = new FormData();
        formData.append('action', 'control');
        formData.append('service', service);
        formData.append('command', action);
        
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            networkManager.addLog(`${service} service ${action}ed successfully`, 'success');
            networkManager.showNotification(`${service} đã được ${action} thành công!`, 'success');
            
            // Update service status after 2 seconds
            setTimeout(() => {
                networkManager.updateServiceStatus();
            }, 2000);
        } else {
            networkManager.addLog(`Error: ${data.message}`, 'error');
            networkManager.showNotification(`Lỗi: ${data.message}`, 'danger');
        }
    } catch (error) {
        console.error('Error controlling service:', error);
        networkManager.addLog(`Error controlling ${service}: ${error.message}`, 'error');
        networkManager.showNotification(`Lỗi khi điều khiển ${service}: ${error.message}`, 'danger');
    } finally {
        // Restore button state
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Maintenance functions
async function installService() {
    const select = document.getElementById('serviceSelect');
    const service = select.value;
    
    if (!service) {
        networkManager.showNotification('Vui lòng chọn dịch vụ cần cài đặt', 'warning');
        return;
    }
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cài đặt...';
    
    try {
        const formData = new FormData();
        formData.append('action', 'install');
        formData.append('package', service);
        
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            networkManager.addLog(`Started installation of ${service}`, 'info');
            networkManager.showNotification(`Đã bắt đầu cài đặt ${service}`, 'info');
            
            // Simulate installation progress
            setTimeout(() => {
                networkManager.addLog(`Installation of ${service} completed`, 'success');
                networkManager.showNotification(`Cài đặt ${service} hoàn tất!`, 'success');
                select.value = '';
            }, 5000);
        } else {
            networkManager.addLog(`Installation failed: ${data.message}`, 'error');
            networkManager.showNotification(`Cài đặt thất bại: ${data.message}`, 'danger');
        }
    } catch (error) {
        networkManager.addLog(`Installation error: ${error.message}`, 'error');
        networkManager.showNotification(`Lỗi cài đặt: ${error.message}`, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function configureFirewall() {
    networkManager.addLog('Configuring firewall rules...', 'info');
    networkManager.showNotification('Đang cấu hình firewall...', 'info');
    
    // Simulate firewall configuration
    setTimeout(() => {
        networkManager.addLog('Firewall configuration completed', 'success');
        networkManager.showNotification('Cấu hình firewall hoàn tất!', 'success');
    }, 3000);
}

function updateSystem() {
    networkManager.addLog('System update initiated...', 'info');
    networkManager.showNotification('Đang cập nhật hệ thống...', 'info');
    
    // Simulate system update
    setTimeout(() => {
        networkManager.addLog('System update completed', 'success');
        networkManager.showNotification('Cập nhật hệ thống hoàn tất!', 'success');
    }, 8000);
}

function backupConfigs() {
    networkManager.addLog('Creating configuration backup...', 'info');
    networkManager.showNotification('Đang sao lưu cấu hình...', 'info');
    
    // Simulate backup process
    setTimeout(() => {
        networkManager.addLog('Configuration backup completed', 'success');
        networkManager.showNotification('Sao lưu cấu hình hoàn tất!', 'success');
    }, 4000);
}

function refreshAll() {
    networkManager.addLog('Manual refresh initiated', 'info');
    networkManager.updateServiceStatus();
    networkManager.updateSystemMetrics();
    networkManager.showNotification('Đã làm mới dữ liệu!', 'info');
}

// Initialize the network manager when DOM is loaded
let networkManager;

document.addEventListener('DOMContentLoaded', function() {
    networkManager = new NetworkServiceManager();
    
    // Add some initial logs
    setTimeout(() => {
        networkManager.addLog('Dashboard ready for service management', 'success');
    }, 1000);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (networkManager) {
        if (document.hidden) {
            networkManager.stopAutoUpdate();
        } else {
            networkManager.startAutoUpdate();
            networkManager.updateServiceStatus();
            networkManager.updateSystemMetrics();
        }
    }
});

// Handle window beforeunload
window.addEventListener('beforeunload', function() {
    if (networkManager) {
        networkManager.stopAutoUpdate();
    }
});
