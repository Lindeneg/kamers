#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Building backend image..."
minikube image build -t kamers-backend:latest -f "$PROJECT_ROOT/packages/server/Dockerfile" "$PROJECT_ROOT"

echo "==> Building frontend image..."
minikube image build -t kamers-frontend:latest -f "$PROJECT_ROOT/packages/client/Dockerfile" "$PROJECT_ROOT"

echo "==> Applying Kubernetes manifests..."
kubectl apply -f "$SCRIPT_DIR/backend-secret.yaml"
kubectl apply -f "$SCRIPT_DIR/backend-pvc.yaml"
kubectl apply -f "$SCRIPT_DIR/backend-deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/backend-service.yaml"
kubectl apply -f "$SCRIPT_DIR/frontend-deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/frontend-service.yaml"

echo "==> Waiting for deployments to roll out..."
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend

echo ""
echo "==> Deploy complete! Access the app at:"
minikube service frontend --url
