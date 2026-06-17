@echo off
echo ========================================
echo  高校实验中心耗材管理系统 - 一键启动
echo ========================================
echo.

echo [1/2] 启动后端服务...
start "后端服务" cmd /k "%~dp0start-backend.bat"

echo.
echo 等待后端启动...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] 启动前端服务...
start "前端服务" cmd /k "%~dp0start-frontend.bat"

echo.
echo ========================================
echo  启动完成！
echo  前端: http://localhost:8902
echo  后端: http://localhost:8132
echo  API文档: http://localhost:8132/docs
echo ========================================
echo.
pause
