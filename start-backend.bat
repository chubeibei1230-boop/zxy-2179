@echo off
echo ========================================
echo  高校实验中心耗材管理系统 - 后端启动
echo ========================================
echo.
cd /d "%~dp0backend"
echo [1/3] 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo.
echo [2/3] 安装依赖...
pip install -r requirements.txt
echo.
echo [3/3] 启动后端服务 (端口: 8132)...
echo.
echo 后端API地址: http://localhost:8132
echo API文档地址: http://localhost:8132/docs
echo.
python main.py
pause
