Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
BatFile = ScriptDir & "\INICIAR_SERVER.bat"
WshShell.Run chr(34) & BatFile & Chr(34), 0
Set WshShell = Nothing
