@echo off
echo ====================================
echo  PUBG 감도 분석기 Windows 빌드
echo ====================================

echo [1/3] 라이브러리 설치...
pip install opencv-python Pillow matplotlib numpy pyinstaller

echo [2/3] exe 빌드 중...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name "PUBG감도분석기" ^
  --add-data "." ^
  main.py

echo [3/3] 완료!
echo dist\PUBG감도분석기.exe 파일을 실행하세요.
pause
