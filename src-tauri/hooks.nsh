; ==============================================================================
; RTL View NSIS Installer Hooks - Vercel Geist Minimalist Modern Aesthetic
; ==============================================================================

!define MUI_BGCOLOR "000000"
!define MUI_TEXTCOLOR "EDEDED"
!define MUI_HEADERIMAGE_BITMAP_BGCOLOR "0A0A0A"
!define MUI_HEADERIMAGE_UNBITMAP_BGCOLOR "0A0A0A"
!define MUI_FINISHPAGE_BGCOLOR "000000"
!define MUI_FINISHPAGE_TEXTCOLOR "EDEDED"
!define MUI_WELCOMEPAGE_BGCOLOR "000000"
!define MUI_WELCOMEPAGE_TEXTCOLOR "EDEDED"

; Auto-launch after finish (Discord-style instant launch)
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAINBINARYNAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch RTL View immediately"

!macro NSIS_HOOK_PREINSTALL
  ; Pre-install hook
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop Shortcut for easy 1-click launch
  CreateShortCut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
!macroend
