#!/bin/bash
cd server/src/entities
for file in *.ts; do
  if [ "$file" != "index.ts" ]; then
    name="${file%.*}"
    echo "import { $name } from '../entities/$name';"
  fi
done
echo "const entities = ["
for file in *.ts; do
  if [ "$file" != "index.ts" ]; then
    name="${file%.*}"
    echo "  $name,"
  fi
done
echo "];"
