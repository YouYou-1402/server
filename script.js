class NetworkServiceManager {
    constructor() {
        this.apiUrl = '/api.php';
        this.services = {
            'apache2': { name: 'Apache2', port: 80 },
            'nginx': { name: 'Nginx', port: 8080 },
            'haproxy': { name: 'HaProxy', port: 80 },
            'vsftpd': { name: 'FTP Server', port: 21 },
            'ssh': { name: 'SSH Server', port: 22 },
            'isc-dhcp-server': { name: 'DHCP Server', port: 67 },
            'inetd': { name: 'Telnet - Inetd', port: 23 }
        };
        
        this.init();
    }

    init() {
        this.updateServiceStatus();
        this.startMonitoring();
        setInterval(() => {
            this.updateServiceStatus();
            this.updateSystemMetrics();
        }, 10000); // Update every 10 seconds
    }

    async updateServiceStatus() {
        try {
            const response = await fetch(`${this.apiUrl}?action=status`);
            const data = await response.json();
            
            Object.keys(data).forEach(service => {
                this.updateServiceCard(service, data[service]);
            });
        } catch (error) {
            console.error('Error updating service status:', error);
        }
    }

    updateServiceCard(serviceName, isRunning) {
        const cards = document.querySelectorAll('.service-card');
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent;
            const service = Object.values(this.services).find(s => s.name === title);
            
            if (service && Object.keys(this.services).find(key => this.services[key] === service) === serviceName) {
                const statusBadge = card.querySelector('.status-badge');
                statusBadge.className = `status-badge ${isRunning ? 'running' : 'stopped'}`;
                statusBadge.textContent = isRunning ? 'Đang chạy' : 'Đã dừng';
            }
        });
    }

    async updateSystemMetrics() {
        try {
            const response = await fetch(`${this.apiUrl}?action=metrics`);
            const data = await response.json();
            
            this.updateProgressBar('cpu-bar', data.cpu);
            this.updateProgressBar('memory-bar', data.memory);
            this.updateProgressBar('disk-bar', data.disk);
            this.updateProgressBar('network-bar', data.network);
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    updateProgressBar(id, value) {
        const bar = document.getElementById(id);
        if (bar) {
            bar.style.width = `${value}%`;
            bar.textContent = `${Math.round(value)}%`;
            
            // Update color based on value
            bar.className = 'progress-bar';
            if (value < 50) bar.classList.add('bg-success');
            else if (value < 80) bar.classList.add('bg-warning');
            else bar.classList.add('bg-danger');
        }
    }

    addLog(message) {
        const logContent = document.getElementById('logContent');
        const timestamp = new Date().toLocaleString('vi-VN');
        const newLog = `[${timestamp}] ${message}\n`;
        
        logContent.textContent = newLog + logContent.textContent;
        
        // Keep only last 20 lines
        const lines = logContent.textContent.split('\n');
        if (lines.length > 20) {
            logContent.textContent = lines.slice(0, 20).join('\n');
        }
    }

    startMonitoring() {
        // Real-time monitoring placeholder
        console.log('Monitoring started for server 54.225.52.171');
    }
}

// Service control functions
async function controlService(service, action) {
    try {
        const formData = new FormData();
        formData.append('action', 'control');
        formData.append('service', service);
        formData.append('command', action);
        
        const response = await fetch('/api.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            networkManager.addLog(`${service} service ${action}ed successfully`);
            setTimeout(() => networkManager.updateServiceStatus(), 2000);
        } else {
            networkManager.addLog(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error controlling service:', error);
        networkManager.addLog(`Error controlling ${service}: ${error.message}`);
    }
}

// Maintenance functions
async function installService() {
    const select = document.getElementById('serviceSelect');
    const service = select.value;
    
    if (!service) {
        alert('Vui lòng chọn dịch vụ cần cài đặt');
        return;
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cài đặt...';
    
    // Simulate installation
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> Cài đặt';
        alert(`Đã cài đặt thành công ${service}`);
        networkManager.addLog(`Installed ${service} successfully`);
    }, 3000);
}

function configureFirewall() {
    networkManager.addLog('Configuring firewall rules...');
    alert('Đang cấu hình firewall...');
}

function updateSystem() {
    networkManager.addLog('System update initiated...');
    alert('Đang cập nhật hệ thống...');
}

function backupConfigs() {
    networkManager.addLog('Creating configuration backup...');
    alert('Đang sao lưu cấu hình...');
}

function refreshAll() {
    networkManager.updateServiceStatus();
    networkManager.updateSystemMetrics();
    networkManager.addLog('Dashboard refreshed');
}

// Initialize the application
let networkManager;
document.addEventListener('DOMContentLoaded', () => {
    networkManager = new NetworkServiceManager();
});

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
