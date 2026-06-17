@echo off
echo ========================================
echo  高校实验中心耗材管理系统 - 前端启动
echo ========================================
echo.
cd /d "%~dp0frontend"
echo [1/3] 检查Node.js环境...
node --version
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js 16+
    pause
    exit /b 1
)
echo.
echo [2/3] 安装依赖...
call npm install
echo.
echo [3/3] 启动前端开发服务器 (端口: 8902)...
echo.
echo 前端访问地址: http://localhost:8902
echo.
call npm run dev
pause
