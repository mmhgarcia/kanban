# Project Context - Kanban Board

## ESTADO ACTUAL
Aplicación Kanban React+Vite con dos modos: Mensual y Estados (Status). 
Recientemente agregados botones Backup/Restore en header (solo presentación visual).

## ÚLTIMOS CAMBIOS
- Commit 1a785b3: Botones Backup/Restore en header con estilos responsive
- Merge con cambios remotos incluyó: ConfirmModal, BackupBar component
- El proyecto usa Cordova para versión móvil

## ESTRUCTURA
- `src/components/Header/Header.tsx` - Header con modo switcher, proyectos, voz, backup/restore
- `src/components/Board/Board.tsx` - Main board con lógica de alarmas y comandos de voz
- `src/components/Column/Column.tsx` - Columnas con tarjetas
- `src/components/CardEditor/` - Editores mensuales y de proyectos
- `src/hooks/useBoard.ts` - Hook principal de estado
- `src/services/storage.ts` - Persistencia con localforage/IndexedDB
- `src/utils/audioService.ts` - Sistema de alertas médicas con audio

## COMANDOS IMPORTANTES
- Build: `npm run build` (output en `www/` para Cordova)
- Dev: `npm run dev`
- Los commits usan formato estándar con Devin co-authorship

## TECNOLOGÍAS
- React + TypeScript + Vite
- localforage para persistencia
- Web Speech API para comandos de voz
- Web Audio API para alertas médicas
- Cordova para mobile

## PENDIENTES/TODO
- Implementar lógica funcional para botones Backup/Restore (actualmente solo presentación)
- Los cambios remotos agregaron BackupBar component - verificar integración

## ESTILOS
- Tema oscuro: #1a1a2e background, #e94560 acentos
- Responsive con media queries para móvil (max-width: 740px, 820px)