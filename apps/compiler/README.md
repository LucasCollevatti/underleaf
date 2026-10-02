# Underleaf compiler boundary

The current compiler implementation is the imported CLSI service, started
inside the application image and reached only through the web application's
internal compile flow. The web layer uses
`UnderleafCompilerGateway.compile({ projectId, userId, options })` as the
stable boundary.

The gateway returns the existing compile result, including status, output
files, build identifiers, logs and validation problems. The editor and PDF
download routes remain the only public-facing consumers of those artifacts.

This directory is the architectural home for the future dedicated compiler
service. Moving CLSI behind a separate container can therefore happen behind
the gateway without changing editor routes or exposing the compiler API on the
host network.

