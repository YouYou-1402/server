<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

function executeCommand($command) {
    $output = shell_exec($command . ' 2>&1');
    return $output ? trim($output) : '';
}

function getServiceStatus($service) {
    $status = executeCommand("systemctl is-active $service");
    return $status === 'active';
}

function controlService($service, $action) {
    $allowedServices = [
        'apache2', 'nginx', 'haproxy', 'vsftpd', 
        'ssh', 'sshd', 'isc-dhcp-server', 'inetd',
        'mysql', 'postgresql', 'redis-server', 'mongod'
    ];
    $allowedActions = ['start', 'stop', 'restart', 'status', 'enable', 'disable'];
    
    if (!in_array($service, $allowedServices) || !in_array($action, $allowedActions)) {
        return [
            'success' => false, 
            'message' => 'Invalid service or action',
            'service' => $service,
            'action' => $action
        ];
    }
    
    $command = "sudo systemctl $action $service";
    $output = executeCommand($command);
    $exitCode = 0;
    
    // Check if command was successful
    if ($action === 'start' || $action === 'restart') {
        sleep(2); // Wait for service to start
        $isRunning = getServiceStatus($service);
        $success = $isRunning;
    } elseif ($action === 'stop') {
        sleep(1);
        $isRunning = getServiceStatus($service);
        $success = !$isRunning;
    } else {
        $success = true;
    }
    
    return [
        'success' => $success,
        'message' => $success ? "Service $service $action completed successfully" : "Failed to $action $service",
        'output' => $output,
        'service' => $service,
        'action' => $action,
        'status' => getServiceStatus($service)
    ];
}

function getSystemMetrics() {
    // CPU Usage
    $cpuCmd = "grep 'cpu ' /proc/stat | awk '{usage=(\$2+\$4)*100/(\$2+\$3+\$4+\$5)} END {print usage}'";
    $cpu = floatval(executeCommand($cpuCmd));
    
    // Memory Usage
    $memCmd = "free | grep Mem | awk '{printf \"%.1f\", \$3/\$2 * 100.0}'";
    $memory = floatval(executeCommand($memCmd));
    
    // Disk Usage
    $diskCmd = "df -h / | awk 'NR==2{print \$5}' | cut -d'%' -f1";
    $disk = floatval(executeCommand($diskCmd));
    
    // Network Activity (bytes received on eth0 or first network interface)
    $networkCmd = "cat /proc/net/dev | grep -E '(eth0|ens|enp)' | head -1 | awk '{print \$2}' | head -1";
    $networkBytes = intval(executeCommand($networkCmd));
    $network = min(($networkBytes / 1000000) % 100, 99); // Convert to MB and limit to 99%
    
    // Load Average
    $loadCmd = "uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//'";
    $load = floatval(executeCommand($loadCmd));
    
    return [
        'cpu' => round($cpu, 1),
        'memory' => round($memory, 1),
        'disk' => round($disk, 1),
        'network' => round($network, 1),
        'load' => round($load, 2),
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

function getAllServicesStatus() {
    $services = [
        'apache2' => 'Apache2',
        'nginx' => 'Nginx', 
        'haproxy' => 'HaProxy',
        'vsftpd' => 'FTP Server',
        'ssh' => 'SSH Server',
        'isc-dhcp-server' => 'DHCP Server'
    ];
    
    $status = [];
    foreach ($services as $service => $name) {
        $status[$service] = [
            'name' => $name,
            'status' => getServiceStatus($service),
            'enabled' => trim(executeCommand("systemctl is-enabled $service 2>/dev/null")) === 'enabled'
        ];
    }
    
    return $status;
}

function installPackage($package) {
    $allowedPackages = [
        'mysql-server', 'postgresql', 'redis-server', 
        'mongodb-org', 'docker.io', 'nodejs', 'python3-pip'
    ];
    
    if (!in_array($package, $allowedPackages)) {
        return [
            'success' => false,
            'message' => 'Package not allowed for installation'
        ];
    }
    
    // Update package list first
    executeCommand('sudo apt update');
    
    // Install package
    $output = executeCommand("sudo apt install -y $package");
    
    return [
        'success' => true,
        'message' => "Package $package installation initiated",
        'output' => $output
    ];
}

function getSystemInfo() {
    $uptime = executeCommand('uptime -p');
    $kernel = executeCommand('uname -r');
    $distro = executeCommand('lsb_release -d | cut -f2');
    $hostname = executeCommand('hostname');
    
    return [
        'hostname' => $hostname,
        'uptime' => $uptime,
        'kernel' => $kernel,
        'distro' => $distro,
        'ip' => $_SERVER['SERVER_ADDR'] ?? '54.225.52.171'
    ];
}

// Main request handler
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'control':
            $service = $_POST['service'] ?? '';
            $command = $_POST['command'] ?? '';
            echo json_encode(controlService($service, $command));
            break;
            
        case 'status':
            echo json_encode(getAllServicesStatus());
            break;
            
        case 'metrics':
            echo json_encode(getSystemMetrics());
            break;
            
        case 'install':
            $package = $_POST['package'] ?? '';
            echo json_encode(installPackage($package));
            break;
            
        case 'info':
            echo json_encode(getSystemInfo());
            break;
            
        case 'logs':
            $service = $_GET['service'] ?? 'syslog';
            $lines = $_GET['lines'] ?? '50';
            $logs = executeCommand("sudo journalctl -u $service -n $lines --no-pager");
            echo json_encode(['logs' => $logs]);
            break;
            
        default:
            echo json_encode([
                'error' => 'Invalid action',
                'available_actions' => ['control', 'status', 'metrics', 'install', 'info', 'logs']
            ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Server error: ' . $e->getMessage(),
        'action' => $action
    ]);
}
?>
