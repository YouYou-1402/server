<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function executeCommand($command) {
    $output = shell_exec($command . ' 2>&1');
    return $output;
}

function getServiceStatus($service) {
    $status = executeCommand("systemctl is-active $service");
    return trim($status) === 'active';
}

function controlService($service, $action) {
    $allowedServices = ['apache2', 'nginx', 'haproxy', 'vsftpd', 'ssh', 'isc-dhcp-server', 'inetd'];
    $allowedActions = ['start', 'stop', 'restart', 'status'];
    
    if (!in_array($service, $allowedServices) || !in_array($action, $allowedActions)) {
        return ['success' => false, 'message' => 'Invalid service or action'];
    }
    
    $command = "sudo systemctl $action $service";
    $output = executeCommand($command);
    
    return [
        'success' => true,
        'message' => "Service $service $action completed",
        'output' => $output
    ];
}

function getSystemMetrics() {
    // CPU Usage
    $cpu = executeCommand("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    
    // Memory Usage
    $memory = executeCommand("free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'");
    
    // Disk Usage
    $disk = executeCommand("df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1");
    
    // Network (simplified)
    $network = rand(10, 50); // Placeholder
    
    return [
        'cpu' => floatval($cpu),
        'memory' => floatval($memory),
        'disk' => floatval($disk),
        'network' => $network
    ];
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'control':
        $service = $_POST['service'] ?? '';
        $command = $_POST['command'] ?? '';
        echo json_encode(controlService($service, $command));
        break;
        
    case 'status':
        $services = ['apache2', 'nginx', 'haproxy', 'vsftpd', 'ssh', 'isc-dhcp-server'];
        $status = [];
        foreach ($services as $service) {
            $status[$service] = getServiceStatus($service);
        }
        echo json_encode($status);
        break;
        
    case 'metrics':
        echo json_encode(getSystemMetrics());
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
}
?>
