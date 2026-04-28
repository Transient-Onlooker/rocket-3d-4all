# Rocket Flight Sim

브라우저에서 실행되는 로켓 비행 시뮬레이터입니다.  
`Vite + React + TypeScript + Zustand + Chart.js + react-three-fiber` 기반으로 구현했으며, 물리 계산 결과를 `2D 차트`와 `3D 비행 뷰`로 함께 시각화합니다.

## Overview

이 프로젝트는 단순한 그래프 데모가 아니라, 로켓 비행의 핵심 요소를 인터랙티브하게 탐색할 수 있도록 설계한 시뮬레이션 프론트엔드입니다.

- RK4 기반 수치 적분 시뮬레이션
- 추력, 연료 소모, 항력, 중력, 대기 밀도 반영
- 발사 레일 구간과 바람 영향을 포함한 비행 계산
- 2D 궤적, 텔레메트리 차트, 3D 비행 재생 뷰 제공
- 프리셋 기반 시나리오 비교 지원

## Highlights

- 물리 모델과 시각화를 분리한 구조
- 실시간 파라미터 조정과 즉시 반영되는 결과 뷰
- 3D 재생 뷰와 2D 궤적 차트의 동기화
- Zustand 기반 상태 관리로 입력, 시뮬레이션 결과, 재생 상태 일관성 유지
- GitHub Pages 배포를 고려한 정적 프론트엔드 구성

## Tech Stack

- Vite
- React
- TypeScript
- Zustand
- Tailwind CSS
- Chart.js
- Three.js
- @react-three/fiber
- @react-three/drei

## Getting Started

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

Windows에서는 루트의 `run.bat`를 실행해도 됩니다.

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```text
rocket-3d-4all/
├─ public/
├─ src/
│  ├─ components/
│  ├─ config/
│  ├─ physics/
│  ├─ store/
│  ├─ types/
│  └─ utils/
├─ .github/
├─ run.bat
├─ vite.config.ts
└─ package.json
```

## 3D Interaction

- 좌클릭 드래그: 회전
- 마우스 휠: 확대 / 축소
- 우클릭 드래그: 화면 이동
- `추적` 모드: 로켓을 따라가는 카메라
- `자유` 모드: 사용자가 직접 시점 제어
- `시점 재설정`: 추적 시점으로 복귀

## Presets

다양한 발사 시나리오를 바로 비교할 수 있도록 프리셋을 제공합니다.

- 기본형
- 고고도 관측 로켓
- 강풍 테스트
- 고추력 스프린트
- 장연소 비행
- 중량 탑재형
- 장거리 사선 발사
- 저항 최소화 실험

## Deployment

GitHub Pages 기반으로 배포합니다.  
저장소 설정에서 `Settings > Pages > Source`를 `GitHub Actions`로 설정하면 배포 워크플로를 사용할 수 있습니다.

## Engineering Direction

이 프로젝트는 현재도 완성도 높은 인터랙티브 시뮬레이션이지만, 더 높은 정확도와 분석성을 목표로 다음 확장 방향을 염두에 두고 설계했습니다.

- 추력 곡선 입력 및 시간 기반 엔진 모델
- Cd(Mach) 기반 항력 모델 고도화
- 고도별 풍속 프로파일과 외란 반영
- 낙하산 및 회수 시퀀스 추가
- Monte Carlo 기반 민감도 분석
- 다단 로켓 및 이벤트 시퀀스 확장
- 테스트 코드 및 검증 시나리오 보강

## Portfolio Focus

이 프로젝트에서 특히 강조하고 싶은 지점은 다음과 같습니다.

- 물리 계산과 UI 표현을 연결하는 상태 설계
- 차트와 3D 뷰를 함께 사용하는 시뮬레이션 경험 설계
- 사용자가 파라미터를 조정하며 결과를 탐색할 수 있는 인터랙션 설계
- 시뮬레이션 도메인을 프론트엔드 애플리케이션으로 구조화한 구현 경험
