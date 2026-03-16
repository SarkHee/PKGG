#!/bin/bash
# Mac/Linux 테스트용 실행 스크립트
echo "라이브러리 설치 중..."
pip3 install opencv-python Pillow matplotlib numpy

echo "실행 중..."
python3 main.py
