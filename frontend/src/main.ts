import { LitElement, css, html } from 'lit';
import { downloadDiagnostic as downloadDiagnosticFile, copyDiagnostic as copyDiagnosticFile } from './diagnostics-service';
import { api } from './api';
import { CAPABILITY_DEFINITIONS } from './capabilities';
import { resolveLocale, resolveTheme, translate } from './locale';
import { capabilityText as resolveCapabilityText, operationText as resolveOperationText, packText as resolvePackText, pageSubtitle, pageTitle, statusText as resolveStatusText } from './view-helpers';
import { loadDevelopmentReports, queueDevelopmentJob, watchDevelopmentJob } from './development-service';
import { property, state } from 'lit/decorators.js';
import { EXTRA_TRANSLATIONS } from './i18n-extra';
import { DEVELOPMENT_TRANSLATIONS } from './i18n-development';
import { DEVELOPMENT_EXTRA_TRANSLATIONS } from './i18n-development-extra';
import { UI_TRANSLATIONS } from './i18n-ui';
import { UI_EXTRA_TRANSLATIONS } from './i18n-ui-extra';
import { FINAL_TRANSLATIONS } from './i18n-final';

import {
  type AuditEvent,
  type Client,
  type DevelopmentCatalog,
  type DevelopmentOperation,
  type DevelopmentPack,
  type DevelopmentReport,
  type DevelopmentResult,
  type Discovery,
  type HealthDetails,
  type Profile,
  type Ready,
  type UiContext,
  type View,
} from './models';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    gateway: 'Gateway', controlPlane: 'control plane', overview: 'Overview', development: 'Dev Console', clients: 'Clients', policy: 'Policy', mcp: 'MCP', audit: 'Audit',
    observerFirst: 'observer-first', operatorDisabled: 'Operator capabilities disabled', gatewayReady: 'Gateway ready', checkingGateway: 'Checking gateway',
    developmentTitle: 'Development Console', runAll: 'Run all', observerProbes: 'Observer probes', executionEvidence: 'Execution evidence', historicalEvidence: 'Historical evidence',
    countLatency: 'Count, latency, status and sanitized payload.', internalSurface: 'Internal Ingress-only verification surface.', runProbe: 'Run', entityFilter: 'Entity filter', startTime: 'Start time',
    exactResponse: 'Run a probe to inspect the exact adapter response.', blocked: 'Blocked by design.', approvalRequired: 'approval required', operatorDisabledTag: 'operator disabled', noMcpMutation: 'no MCP mutation',
    overviewTitle: 'Secure gateway control plane.', developmentSubtitle: 'Run every observer probe internally and see exactly where retrieval succeeds or fails.',
    clientsTitle: 'Clients & tokens', policyTitle: 'Profiles & policy', mcpTitle: 'MCP transport', auditTitle: 'Sanitized audit trail',
    capabilitiesHelp: 'Choose exactly which read-only data this client may access.', selectAllObserver: 'Select all observer', clearSelection: 'Clear', selectedCapabilities: 'selected · observer only', issueClient: 'Issue client',
    capDiagnosticsLabel: 'Gateway diagnostics', capDiagnosticsDescription: 'Read gateway health, readiness, capabilities and sanitized diagnostics.', capEntitiesLabel: 'Entity inventory', capEntitiesDescription: 'Read bounded entity and service inventory metadata.', capStatesLabel: 'Entity states', capStatesDescription: 'Read current states, optionally for one entity.', capAutomationsLabel: 'Automations', capAutomationsDescription: 'Read automation entities and their current state.', capConfigLabel: 'Configuration metadata', capConfigDescription: 'Read safe configuration and registry metadata without secrets.', capHistoryLabel: 'History', capHistoryDescription: 'Read bounded state history with optional filters.', capLogbookLabel: 'Logbook', capLogbookDescription: 'Read bounded logbook records with optional filters.', capRegistryLabel: 'Registries and resources', capRegistryDescription: 'Read devices, areas, floors, labels, entity registry, scripts, scenes, helpers and integrations.', capServicesLabel: 'Service catalog', capServicesDescription: 'Read available services; this does not execute services.', capEventsLabel: 'Event catalog', capEventsDescription: 'Read the bounded event catalog; this does not fire events.', capWriteServicesLabel: 'Service execution', capWriteServicesDescription: 'Write capability; unavailable while operator mode is disabled.', capWriteAutomationsLabel: 'Automation changes', capWriteAutomationsDescription: 'Write capability; unavailable while operator mode is disabled.', capWriteConfigLabel: 'Configuration changes', capWriteConfigDescription: 'Write capability; unavailable while operator mode is disabled.',
    language: 'Language', navigation: 'Gateway navigation', overviewSubtitle: 'A quiet observatory for identity, readiness and read-only access.', clientsSubtitle: 'Issue independent credentials and revoke them without exposing stored secrets.', policySubtitle: 'Review the capability boundaries enforced before any MCP operation.', mcpSubtitle: 'Inspect the authenticated Streamable HTTP surface exposed to observer clients.', auditSubtitle: 'Trace decisions and outcomes without exposing request secrets.', storage: 'Storage', privateState: 'Private SQLite state', homeAssistant: 'Home Assistant', supervisorUpstream: 'Supervisor upstream', activeClients: 'Active clients', bearerIdentities: 'Bearer identities', auditEvents: 'Audit events', sanitizedRecords: 'Sanitized records', systemPosture: 'System posture', postureDescription: 'All management requests are protected by Supervisor Ingress identity. Client tokens are hashed at rest and displayed only once during issuance.', quickActions: 'Quick actions', manageClients: 'Manage clients', viewAudit: 'View audit', upstreamHealth: 'Upstream health', healthDescription: 'Independent checks for Home Assistant and its read resources.', systemTopology: 'System topology', topologyDescription: 'Live dependency posture from the current health checks.', registeredClients: 'Registered clients', tokensNotListed: 'Tokens never appear in this list.', refresh: 'Refresh', identity: 'Identity', profile: 'Profile', capabilities: 'Capabilities', status: 'Status', noClients: 'No clients issued yet.', issueObserver: 'Issue observer client', tokenOnce: 'The token will be shown once after creation.', clientId: 'Client ID', displayName: 'Display name', readOnly: 'observer · read-only', operatorDisabledOption: 'operator · disabled', run: 'Run', exportDiagnostic: 'Export diagnostic', historicalEvidenceLabel: 'Historical evidence', mutationProbes: 'Mutation probes', policyMatrix: 'Policy matrix', evaluateRequest: 'Evaluate a request', streamableHttp: 'Streamable HTTP', authenticatedEndpoint: 'Authenticated endpoint', discovery: 'Discovery', bearerToken: 'Bearer token', loadDiscovery: 'Load discovery', oneTimeCredential: 'One-time credential', saveToken: 'Save this token now', tokenOnlyOnce: 'This is the only time the plaintext token will be shown. It will not be retrievable later.', copyToken: 'Copy token', savedIt: 'I saved it', sanitizedAuditEvents: 'Sanitized audit events', auditNotStored: 'Request bodies, credentials, tokens and digests are never stored here.', allDecisions: 'All decisions', allowed: 'Allowed', denied: 'Denied', approvalRequiredOption: 'Approval required', noAudit: 'No audit events match the selected filter.', errorLoad: 'Unable to load gateway state', copyDiagnostic: 'Copy diagnostic', retry: 'Retry', items: 'items', result: 'result(s)', export: 'Export diagnostic', mutationsBlocked: 'Blocked by design.',
  },
  es: {
    gateway: 'Gateway', controlPlane: 'panel de control', overview: 'Resumen', development: 'Consola de desarrollo', clients: 'Clientes', policy: 'Política', mcp: 'MCP', audit: 'Auditoría',
    observerFirst: 'solo observador', operatorDisabled: 'Capacidades operator desactivadas', gatewayReady: 'Gateway listo', checkingGateway: 'Comprobando gateway',
    developmentTitle: 'Consola de desarrollo', runAll: 'Ejecutar todo', observerProbes: 'Pruebas observer', executionEvidence: 'Evidencia de ejecución', historicalEvidence: 'Evidencia histórica',
    countLatency: 'Cantidad, latencia, estado y payload sanitizado.', internalSurface: 'Superficie interna protegida por Ingress.', runProbe: 'Ejecutar', entityFilter: 'Filtro de entidad', startTime: 'Hora de inicio',
    exactResponse: 'Ejecuta una prueba para inspeccionar la respuesta exacta del adaptador.', blocked: 'Bloqueado por diseño.', approvalRequired: 'aprobación requerida', operatorDisabledTag: 'operator desactivado', noMcpMutation: 'sin mutaciones MCP',
    overviewTitle: 'Panel de control seguro.', developmentSubtitle: 'Ejecuta internamente las pruebas observer y comprueba exactamente qué lecturas funcionan o fallan.',
    clientsTitle: 'Clientes y tokens', policyTitle: 'Perfiles y política', mcpTitle: 'Transporte MCP', auditTitle: 'Auditoría sanitizada',
    capabilitiesHelp: 'Elige exactamente qué información de solo lectura puede consultar este cliente.', selectAllObserver: 'Seleccionar todo observer', clearSelection: 'Limpiar', selectedCapabilities: 'seleccionadas · solo observer', issueClient: 'Crear cliente',
    capDiagnosticsLabel: 'Diagnósticos del gateway', capDiagnosticsDescription: 'Consultar salud, readiness, capacidades y diagnósticos sanitizados del gateway.', capEntitiesLabel: 'Inventario de entidades', capEntitiesDescription: 'Consultar metadatos bounded de entidades y servicios.', capStatesLabel: 'Estados de entidades', capStatesDescription: 'Consultar estados actuales, opcionalmente para una entidad.', capAutomationsLabel: 'Automatizaciones', capAutomationsDescription: 'Consultar entidades de automatización y su estado actual.', capConfigLabel: 'Metadatos de configuración', capConfigDescription: 'Consultar configuración segura y registros sin secretos.', capHistoryLabel: 'Historial', capHistoryDescription: 'Consultar historial de estados bounded con filtros opcionales.', capLogbookLabel: 'Logbook', capLogbookDescription: 'Consultar registros bounded del logbook con filtros opcionales.', capRegistryLabel: 'Registros y recursos', capRegistryDescription: 'Consultar dispositivos, áreas, plantas, etiquetas, registro de entidades, scripts, escenas, helpers e integraciones.', capServicesLabel: 'Catálogo de servicios', capServicesDescription: 'Consultar servicios disponibles; no ejecuta servicios.', capEventsLabel: 'Catálogo de eventos', capEventsDescription: 'Consultar el catálogo bounded de eventos; no dispara eventos.', capWriteServicesLabel: 'Ejecución de servicios', capWriteServicesDescription: 'Capability de escritura; no disponible con operator desactivado.', capWriteAutomationsLabel: 'Cambios de automatizaciones', capWriteAutomationsDescription: 'Capability de escritura; no disponible con operator desactivado.', capWriteConfigLabel: 'Cambios de configuración', capWriteConfigDescription: 'Capability de escritura; no disponible con operator desactivado.',
    language: 'Idioma', navigation: 'Navegación del gateway', overviewSubtitle: 'Un observatorio seguro para identidad, disponibilidad y acceso de solo lectura.', clientsSubtitle: 'Crea credenciales independientes y revócalas sin exponer secretos almacenados.', policySubtitle: 'Revisa los límites de capabilities aplicados antes de cada operación MCP.', mcpSubtitle: 'Inspecciona la superficie Streamable HTTP autenticada para clientes observer.', auditSubtitle: 'Traza decisiones y resultados sin exponer secretos de las peticiones.', storage: 'Almacenamiento', privateState: 'Estado SQLite privado', homeAssistant: 'Home Assistant', supervisorUpstream: 'Servicio de Supervisor', activeClients: 'Clientes activos', bearerIdentities: 'Identidades Bearer', auditEvents: 'Eventos de auditoría', sanitizedRecords: 'Registros sanitizados', systemPosture: 'Estado del sistema', postureDescription: 'Todas las peticiones de gestión están protegidas por la identidad de Supervisor Ingress. Los tokens se almacenan como hashes y solo se muestran una vez.', quickActions: 'Acciones rápidas', manageClients: 'Gestionar clientes', viewAudit: 'Ver auditoría', upstreamHealth: 'Salud del servicio upstream', healthDescription: 'Comprobaciones independientes de Home Assistant y sus recursos de lectura.', systemTopology: 'Topología del sistema', topologyDescription: 'Estado actual de las dependencias según las comprobaciones de salud.', registeredClients: 'Clientes registrados', tokensNotListed: 'Los tokens nunca aparecen en esta lista.', refresh: 'Actualizar', identity: 'Identidad', profile: 'Perfil', capabilities: 'Capabilities', status: 'Estado', noClients: 'Todavía no hay clientes creados.', issueObserver: 'Crear cliente observer', tokenOnce: 'El token se mostrará una sola vez después de crear el cliente.', clientId: 'ID del cliente', displayName: 'Nombre visible', readOnly: 'observer · solo lectura', operatorDisabledOption: 'operator · desactivado', run: 'Ejecutar', exportDiagnostic: 'Exportar diagnóstico', export: 'Exportar', historicalEvidenceLabel: 'Evidencia histórica', mutationProbes: 'Pruebas de mutación', policyMatrix: 'Matriz de política', evaluateRequest: 'Evaluar una petición', streamableHttp: 'Streamable HTTP', authenticatedEndpoint: 'Endpoint autenticado', discovery: 'Descubrimiento', bearerToken: 'Token Bearer', loadDiscovery: 'Cargar descubrimiento', oneTimeCredential: 'Credencial de un solo uso', saveToken: 'Guarda este token ahora', tokenOnlyOnce: 'Esta es la única vez que se mostrará el token en texto plano. No podrá recuperarse después.', copyToken: 'Copiar token', savedIt: 'Ya lo he guardado', sanitizedAuditEvents: 'Eventos de auditoría sanitizados', auditNotStored: 'Los cuerpos, credenciales, tokens y hashes nunca se guardan aquí.', allDecisions: 'Todas las decisiones', allowed: 'Permitida', denied: 'Denegada', approvalRequiredOption: 'Aprobación requerida', noAudit: 'No hay eventos que coincidan con el filtro.', errorLoad: 'No se pudo cargar el estado del gateway', copyDiagnostic: 'Copiar diagnóstico', retry: 'Reintentar', items: 'elementos', result: 'resultado(s)', mutationsBlocked: 'Bloqueado por diseño.',
  },
  fr: {
    gateway: 'Gateway', controlPlane: 'plan de contrôle', overview: 'Vue d’ensemble', development: 'Console de développement', clients: 'Clients', policy: 'Politique', mcp: 'MCP', audit: 'Audit',
    observerFirst: 'observer uniquement', operatorDisabled: 'Capacités operator désactivées', gatewayReady: 'Gateway prêt', checkingGateway: 'Vérification du gateway',
    developmentTitle: 'Console de développement', runAll: 'Tout exécuter', observerProbes: 'Tests observer', executionEvidence: 'Preuves d’exécution', historicalEvidence: 'Preuves historiques',
    countLatency: 'Quantité, latence, état et payload nettoyé.', internalSurface: 'Surface interne protégée par Ingress.', runProbe: 'Exécuter', entityFilter: 'Filtre d’entité', startTime: 'Heure de début',
    exactResponse: 'Exécutez un test pour inspecter la réponse exacte de l’adaptateur.', blocked: 'Bloqué par conception.', approvalRequired: 'approbation requise', operatorDisabledTag: 'operator désactivé', noMcpMutation: 'aucune mutation MCP',
    overviewTitle: 'Plan de contrôle sécurisé.', developmentSubtitle: 'Exécutez les tests observer et voyez précisément quelles lectures réussissent ou échouent.',
    clientsTitle: 'Clients et tokens', policyTitle: 'Profils et politique', mcpTitle: 'Transport MCP', auditTitle: 'Journal d’audit nettoyé',
  },
  it: { gateway: 'Gateway', controlPlane: 'pannello di controllo', overview: 'Panoramica', development: 'Console sviluppo', clients: 'Client', policy: 'Policy', mcp: 'MCP', audit: 'Audit', observerFirst: 'solo osservazione', operatorDisabled: 'Funzioni operator disattivate', gatewayReady: 'Gateway pronto', checkingGateway: 'Controllo gateway', developmentTitle: 'Console sviluppo', runAll: 'Esegui tutto', observerProbes: 'Probe observer', executionEvidence: 'Evidenza esecuzione', historicalEvidence: 'Evidenza storica', countLatency: 'Conteggio, latenza, stato e payload sanitizzato.', internalSurface: 'Superficie interna protetta da Ingress.', runProbe: 'Esegui', entityFilter: 'Filtro entità', startTime: 'Ora di inizio', exactResponse: 'Esegui un probe per vedere la risposta dell’adapter.', blocked: 'Bloccato per progettazione.', approvalRequired: 'approvazione richiesta', operatorDisabledTag: 'operator disattivato', noMcpMutation: 'nessuna mutazione MCP', overviewTitle: 'Pannello di controllo sicuro.', developmentSubtitle: 'Esegui i probe observer e verifica le letture.', clientsTitle: 'Client e token', policyTitle: 'Profili e policy', mcpTitle: 'Trasporto MCP', auditTitle: 'Audit sanitizzato' },
  de: { gateway: 'Gateway', controlPlane: 'Kontrollzentrale', overview: 'Übersicht', development: 'Entwicklung', clients: 'Clients', policy: 'Richtlinie', mcp: 'MCP', audit: 'Audit', observerFirst: 'nur Observer', operatorDisabled: 'Operator-Funktionen deaktiviert', gatewayReady: 'Gateway bereit', checkingGateway: 'Gateway wird geprüft', developmentTitle: 'Entwicklungskonsole', runAll: 'Alle ausführen', observerProbes: 'Observer-Prüfungen', executionEvidence: 'Ausführungsnachweis', historicalEvidence: 'Historischer Nachweis', countLatency: 'Anzahl, Latenz, Status und bereinigte Nutzdaten.', internalSurface: 'Interne, durch Ingress geschützte Oberfläche.', runProbe: 'Ausführen', entityFilter: 'Entitätsfilter', startTime: 'Startzeit', exactResponse: 'Prüfung ausführen, um die Adapterantwort zu sehen.', blocked: 'Absichtlich blockiert.', approvalRequired: 'Genehmigung erforderlich', operatorDisabledTag: 'Operator deaktiviert', noMcpMutation: 'keine MCP-Mutationen', overviewTitle: 'Sichere Kontrollzentrale.', developmentSubtitle: 'Observer-Prüfungen ausführen und Fehler lokalisieren.', clientsTitle: 'Clients und Tokens', policyTitle: 'Profile und Richtlinien', mcpTitle: 'MCP-Transport', auditTitle: 'Bereinigtes Audit' },
  pt: { gateway: 'Gateway', controlPlane: 'painel de controlo', overview: 'Resumo', development: 'Desenvolvimento', clients: 'Clientes', policy: 'Política', mcp: 'MCP', audit: 'Auditoria', observerFirst: 'somente observer', operatorDisabled: 'Funções operator desativadas', gatewayReady: 'Gateway pronto', checkingGateway: 'A verificar gateway', developmentTitle: 'Console de desenvolvimento', runAll: 'Executar tudo', observerProbes: 'Testes observer', executionEvidence: 'Evidência de execução', historicalEvidence: 'Evidência histórica', countLatency: 'Contagem, latência, estado e payload sanitizado.', internalSurface: 'Superfície interna protegida por Ingress.', runProbe: 'Executar', entityFilter: 'Filtro de entidade', startTime: 'Hora inicial', exactResponse: 'Execute um teste para ver a resposta do adaptador.', blocked: 'Bloqueado por desenho.', approvalRequired: 'aprovação necessária', operatorDisabledTag: 'operator desativado', noMcpMutation: 'sem mutações MCP', overviewTitle: 'Painel de controlo seguro.', developmentSubtitle: 'Execute os testes observer e localize falhas.', clientsTitle: 'Clientes e tokens', policyTitle: 'Perfis e política', mcpTitle: 'Transporte MCP', auditTitle: 'Auditoria sanitizada' },
  zh: { gateway: '网关', controlPlane: '控制面板', overview: '概览', development: '开发控制台', clients: '客户端', policy: '策略', mcp: 'MCP', audit: '审计', observerFirst: '仅观察', operatorDisabled: 'Operator 功能已禁用', gatewayReady: '网关就绪', checkingGateway: '正在检查网关', developmentTitle: '开发控制台', runAll: '全部运行', observerProbes: 'Observer 检查', executionEvidence: '执行证据', historicalEvidence: '历史证据', countLatency: '数量、延迟、状态和已脱敏载荷。', internalSurface: '仅限 Ingress 的内部验证界面。', runProbe: '运行', entityFilter: '实体过滤器', startTime: '开始时间', exactResponse: '运行检查以查看适配器响应。', blocked: '按设计禁用。', approvalRequired: '需要批准', operatorDisabledTag: 'Operator 已禁用', noMcpMutation: '无 MCP 修改', overviewTitle: '安全控制面板。', developmentSubtitle: '运行 Observer 检查并定位读取故障。', clientsTitle: '客户端和令牌', policyTitle: '配置文件和策略', mcpTitle: 'MCP 传输', auditTitle: '脱敏审计' },
  ja: { gateway: 'ゲートウェイ', controlPlane: 'コントロールプレーン', overview: '概要', development: '開発コンソール', clients: 'クライアント', policy: 'ポリシー', mcp: 'MCP', audit: '監査', observerFirst: 'Observer 専用', operatorDisabled: 'Operator 機能は無効', gatewayReady: 'ゲートウェイ準備完了', checkingGateway: 'ゲートウェイを確認中', developmentTitle: '開発コンソール', runAll: 'すべて実行', observerProbes: 'Observer プローブ', executionEvidence: '実行結果', historicalEvidence: '履歴結果', countLatency: '件数、レイテンシ、状態、サニタイズ済み payload。', internalSurface: 'Ingress 専用の内部検証画面。', runProbe: '実行', entityFilter: 'エンティティフィルター', startTime: '開始時刻', exactResponse: 'プローブを実行してアダプター応答を確認します。', blocked: '設計上ブロックされています。', approvalRequired: '承認が必要', operatorDisabledTag: 'Operator 無効', noMcpMutation: 'MCP 変更なし', overviewTitle: '安全なコントロールプレーン。', developmentSubtitle: 'Observer プローブを実行し、読み取りの問題を特定します。', clientsTitle: 'クライアントとトークン', policyTitle: 'プロファイルとポリシー', mcpTitle: 'MCP トランスポート', auditTitle: 'サニタイズ済み監査' },
  ru: { gateway: 'Шлюз', controlPlane: 'панель управления', overview: 'Обзор', development: 'Разработка', clients: 'Клиенты', policy: 'Политика', mcp: 'MCP', audit: 'Аудит', observerFirst: 'только наблюдение', operatorDisabled: 'Возможности operator отключены', gatewayReady: 'Шлюз готов', checkingGateway: 'Проверка шлюза', developmentTitle: 'Консоль разработки', runAll: 'Запустить всё', observerProbes: 'Проверки observer', executionEvidence: 'Результаты выполнения', historicalEvidence: 'История', countLatency: 'Количество, задержка, статус и очищенные данные.', internalSurface: 'Внутренняя поверхность только через Ingress.', runProbe: 'Запустить', entityFilter: 'Фильтр сущности', startTime: 'Время начала', exactResponse: 'Запустите проверку для просмотра ответа адаптера.', blocked: 'Заблокировано по дизайну.', approvalRequired: 'требуется одобрение', operatorDisabledTag: 'operator отключён', noMcpMutation: 'без мутаций MCP', overviewTitle: 'Безопасная панель управления.', developmentSubtitle: 'Запускайте проверки observer и находите ошибки чтения.', clientsTitle: 'Клиенты и токены', policyTitle: 'Профили и политика', mcpTitle: 'Транспорт MCP', auditTitle: 'Очищенный аудит' },
  hi: { gateway: 'गेटवे', controlPlane: 'नियंत्रण केंद्र', overview: 'अवलोकन', development: 'डेवलपमेंट', clients: 'क्लाइंट', policy: 'नीति', mcp: 'MCP', audit: 'ऑडिट', observerFirst: 'केवल observer', operatorDisabled: 'Operator सुविधाएँ बंद हैं', gatewayReady: 'गेटवे तैयार', checkingGateway: 'गेटवे जाँचा जा रहा है', developmentTitle: 'डेवलपमेंट कंसोल', runAll: 'सभी चलाएँ', observerProbes: 'Observer जाँच', executionEvidence: 'निष्पादन प्रमाण', historicalEvidence: 'ऐतिहासिक प्रमाण', countLatency: 'गिनती, विलंबता, स्थिति और sanitised payload।', internalSurface: 'Ingress-सुरक्षित आंतरिक सतह।', runProbe: 'चलाएँ', entityFilter: 'एंटिटी फ़िल्टर', startTime: 'प्रारंभ समय', exactResponse: 'Adapter उत्तर देखने के लिए जाँच चलाएँ।', blocked: 'डिज़ाइन के अनुसार अवरुद्ध।', approvalRequired: 'अनुमोदन आवश्यक', operatorDisabledTag: 'Operator बंद', noMcpMutation: 'कोई MCP mutation नहीं', overviewTitle: 'सुरक्षित नियंत्रण केंद्र।', developmentSubtitle: 'Observer जाँच चलाएँ और पढ़ने की समस्याएँ खोजें।', clientsTitle: 'क्लाइंट और टोकन', policyTitle: 'प्रोफ़ाइल और नीति', mcpTitle: 'MCP ट्रांसपोर्ट', auditTitle: 'Sanitised audit' },
  ar: { gateway: 'البوابة', controlPlane: 'لوحة التحكم', overview: 'نظرة عامة', development: 'التطوير', clients: 'العملاء', policy: 'السياسة', mcp: 'MCP', audit: 'التدقيق', observerFirst: 'مراقبة فقط', operatorDisabled: 'ميزات المشغّل معطلة', gatewayReady: 'البوابة جاهزة', checkingGateway: 'جارٍ فحص البوابة', developmentTitle: 'وحدة التطوير', runAll: 'تشغيل الكل', observerProbes: 'فحوصات المراقب', executionEvidence: 'دليل التنفيذ', historicalEvidence: 'الدليل التاريخي', countLatency: 'العدد والكمون والحالة والبيانات المنقحة.', internalSurface: 'واجهة تحقق داخلية محمية عبر Ingress.', runProbe: 'تشغيل', entityFilter: 'مرشح الكيان', startTime: 'وقت البدء', exactResponse: 'شغّل فحصاً لعرض استجابة المكيّف.', blocked: 'محظور حسب التصميم.', approvalRequired: 'الموافقة مطلوبة', operatorDisabledTag: 'المشغّل معطل', noMcpMutation: 'لا تغييرات MCP', overviewTitle: 'لوحة تحكم آمنة.', developmentSubtitle: 'شغّل فحوصات المراقب وحدد أخطاء القراءة.', clientsTitle: 'العملاء والرموز', policyTitle: 'الملفات والسياسة', mcpTitle: 'نقل MCP', auditTitle: 'تدقيق منقح' },
};

for (const [locale, entries] of Object.entries(EXTRA_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}
for (const [locale, entries] of Object.entries(DEVELOPMENT_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}

for (const [locale, entries] of Object.entries(DEVELOPMENT_EXTRA_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}

for (const [locale, entries] of Object.entries(UI_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}

for (const [locale, entries] of Object.entries(UI_EXTRA_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}

for (const [locale, entries] of Object.entries(FINAL_TRANSLATIONS)) {
  TRANSLATIONS[locale] = { ...(TRANSLATIONS[locale] ?? {}), ...entries };
}

export class GatewayApp extends LitElement {
  static properties = {
    view: { type: String },
    ready: { state: true },
    clients: { state: true },
    busy: { state: true },
    error: { state: true },
    issuedToken: { state: true },
    discovery: { state: true },
    audit: { state: true },
    development: { state: true },
    developmentReports: { state: true },
    uiContext: { state: true },
    healthDetails: { state: true },
    localeOverride: { state: true },
  };

  @property({ type: String }) view: View = 'overview';
  @state() ready: Ready | null = null;
  @state() clients: Client[] = [];
  @state() busy = false;
  @state() error = '';
  @state() issuedToken = '';
  @state() discovery: Discovery | null = null;
  @state() audit: AuditEvent[] = [];
  @state() development: DevelopmentCatalog | null = null;
  @state() developmentReports: DevelopmentReport[] = [];
  @state() uiContext: UiContext = { locale: 'en', theme: 'auto' };
  @state() healthDetails: HealthDetails = { status: 'unknown', checks: [] };
  @state() localeOverride = localStorage.getItem('gateway-locale') ?? '';
  @state() developmentResults: DevelopmentResult[] = [];
  @state() developmentProgress = { status: 'idle', completed: 0, total: 0 };
  @state() developmentOutput: unknown = null;
  @state() developmentEntity = '';
  @state() developmentStartTime = '';
  @state() selectedCapabilities = new Set<string>(['ha.read.diagnostics']);
  @state() bootState: 'checking' | 'ready' | 'error' = 'checking';

  static styles = css`
    :host { display: block; color: #e7f0fb; min-height: 100vh; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .shell { min-height: 100vh; position: relative; overflow: hidden; background: #07111f; }
    .shell.light { color: #243447; background: #f4f7fb; }
    .shell.light aside, .shell.light .card { background: #ffffffee; border-color: #d3deea; box-shadow: 0 18px 50px #38516b14; }
    .shell.light p, .shell.light .muted, .shell.light .brand small, .shell.light .card-label, .shell.light .side-foot, .shell.light nav button { color: #607286; }
    .shell.light nav button:hover, .shell.light nav button.active { color: #17324d; background: #dceefa; }
    .shell.light button.primary { color: #17324d; background: #b8dbe8; border-color: #9fc5d4; }
    .shell.light button.primary:hover:not(:disabled) { background: #a8cfdf; border-color: #86b5c8; }
    .shell.light button.secondary { color: #29445d; background: #e5eef5; border-color: #b9cad9; }
    .shell.light .result-row { border-color: #c8d6e1; background: #f8fbfd; }
    .shell.light code, .shell.light .mono { color: #47728d; }
    .shell.light .tag { color: #365f79; background: #e7f0f5; border-color: #c1d2de; }
    .shell.light .ok { color: #2d9864; }
    .shell.light .warn { color: #a66f16; }
    .shell.light .bad { color: #b34b58; }
    .shell.light nav button.active { box-shadow: inset 2px 0 #168bd0; }
    .shell.light th, .shell.light td { border-color: #dbe5ee; } .shell.light td { color: #29445d; }
    .shell.light input, .shell.light select, .shell.light textarea { color: #243447; background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .dev-output { color: #31516b; background: #f5f9fc; border-color: #d3deea; }
    .shell.light .grid { opacity: .25; background-image: linear-gradient(#5c88a31c 1px, transparent 1px), linear-gradient(90deg, #5c88a31c 1px, transparent 1px); }
    .shell::before { content: ''; position: fixed; inset: -20%; pointer-events: none; background: radial-gradient(circle at 18% 0%, #087fb52b, transparent 34%), radial-gradient(circle at 90% 20%, #234b9c22, transparent 36%); animation: drift 32s ease-in-out infinite alternate; }
    .neural { position: fixed; inset: 0; pointer-events: none; opacity: .45; overflow: hidden; }
    .neural::before, .neural::after { content: ''; position: absolute; inset: 8% 4%; background: linear-gradient(28deg, transparent 48%, #4bc9ff22 49%, transparent 50%), linear-gradient(151deg, transparent 48%, #6ce0c522 49%, transparent 50%), linear-gradient(79deg, transparent 49%, #4bc9ff18 50%, transparent 51%); background-size: 260px 210px, 320px 280px, 420px 330px; animation: network-flow 24s linear infinite; mask-image: radial-gradient(ellipse at center, black, transparent 76%); }
    .neural::after { filter: blur(1px); opacity: .7; animation-duration: 36s; animation-direction: reverse; }
    .node { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #65d8ff; box-shadow: 0 0 0 4px #65d8ff14, 0 0 18px #65d8ffcc; animation: node-pulse 4s ease-in-out infinite; }
    .shell.light .neural { opacity: .25; } .shell.light .node { background: #168bd0; box-shadow: 0 0 0 4px #168bd014, 0 0 18px #168bd066; }
    .boot-stage { min-height: min(620px, calc(100vh - 56px)); display: grid; place-items: center; padding: 28px; }
    .boot-card { position: relative; width: min(520px, 100%); padding: 42px 38px; text-align: center; border: 1px solid #31536f; border-radius: 22px; background: #071522d9; box-shadow: 0 24px 70px #02081266; backdrop-filter: blur(14px); }
    .shell.light .boot-card { border-color: #c4d5e1; background: #ffffffec; box-shadow: 0 24px 70px #38516b1c; }
    .boot-orbit { width: 74px; height: 74px; margin: 0 auto 24px; display: grid; place-items: center; border: 1px solid #4bc9ff66; border-radius: 50%; position: relative; animation: boot-orbit 5s linear infinite; }
    .boot-orbit::before, .boot-orbit::after { content: ''; position: absolute; border-radius: 50%; }
    .boot-orbit::before { width: 9px; height: 9px; top: -4px; left: 31px; background: #67e2a0; box-shadow: 0 0 18px #67e2a0; }
    .boot-orbit::after { width: 5px; height: 5px; right: 5px; bottom: 13px; background: #4bc9ff; box-shadow: 0 0 14px #4bc9ff; }
    .boot-core { width: 22px; height: 22px; border-radius: 50%; background: #4bc9ff; box-shadow: 0 0 0 8px #4bc9ff1c, 0 0 28px #4bc9ff99; animation: boot-pulse 2.2s ease-in-out infinite; }
    .shell.light .boot-orbit { border-color: #5b9fc066; } .shell.light .boot-orbit::before { background: #2d9864; box-shadow: 0 0 14px #2d986466; } .shell.light .boot-orbit::after { background: #3c88ac; box-shadow: 0 0 12px #3c88ac66; } .shell.light .boot-core { background: #6caec7; box-shadow: 0 0 0 8px #6caec71c, 0 0 24px #6caec766; }
    .boot-card h1 { margin: 0; font-size: clamp(22px, 3vw, 30px); } .boot-card p { max-width: 390px; margin: 10px auto 0; }
    .boot-status { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px; color: #9fb8cc; font-size: 13px; }
    .shell.light .boot-status { color: #607286; }
    .boot-progress { height: 3px; margin: 22px auto 0; max-width: 300px; overflow: hidden; border-radius: 999px; background: #23415e; }
    .boot-progress::before { content: ''; display: block; width: 42%; height: 100%; border-radius: inherit; background: #4bc9ff; animation: boot-progress 1.8s ease-in-out infinite; }
    .shell.light .boot-progress { background: #dbe7ee; } .shell.light .boot-progress::before { background: #75aec2; }
    .boot-retry { margin-top: 24px; }
    .grid { position: fixed; inset: 0; opacity: .16; pointer-events: none; background-image: linear-gradient(#6fa8d30d 1px, transparent 1px), linear-gradient(90deg, #6fa8d30d 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(to bottom, black, transparent 85%); }
    .layout { position: relative; width: min(1360px, calc(100% - 40px)); margin: auto; display: grid; grid-template-columns: 230px 1fr; gap: 28px; padding: 28px 0; }
    aside { border: 1px solid #23415e; border-radius: 20px; background: #0b1929dd; padding: 20px 14px; height: calc(100vh - 56px); position: sticky; top: 28px; display: flex; flex-direction: column; }
    .brand { padding: 4px 10px 26px; display: flex; gap: 10px; align-items: center; }
    .brand-mark { width: 34px; height: 34px; border: 1px solid #4bc9ff; border-radius: 11px; display: grid; place-items: center; color: #54d1ff; box-shadow: 0 0 22px #16a9ef55; }
    .brand strong { display: block; letter-spacing: -.02em; }
    .brand small, .muted { color: #8ea5bd; }
    nav { display: grid; gap: 5px; }
    nav button { border: 0; color: #8ea5bd; background: transparent; text-align: left; border-radius: 10px; padding: 11px 12px; cursor: pointer; font: inherit; }
    nav button:hover, nav button.active { color: #e7f0fb; background: #16466b88; }
    nav button.active { box-shadow: inset 2px 0 #4bc9ff; }
    .side-foot { margin-top: auto; padding: 12px; border-top: 1px solid #23415e; color: #8ea5bd; font-size: 12px; }
    main { min-width: 0; padding: 10px 0 42px; }
    .topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
    .eyebrow { color: #4bc9ff; letter-spacing: .14em; text-transform: uppercase; font-size: 11px; font-weight: 800; }
    h1 { margin: 6px 0; font-size: clamp(28px, 4vw, 46px); letter-spacing: -.045em; line-height: 1.05; }
    h2 { margin: 0 0 5px; font-size: 18px; letter-spacing: -.02em; }
    h3 { margin: 0 0 14px; font-size: 14px; }
    p { margin: 0; color: #8ea5bd; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #27516a; border-radius: 999px; padding: 7px 11px; color: #67e2a0; background: #0c352a55; white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
    .card { border: 1px solid #23415e; border-radius: 16px; background: #0c1b2ddd; padding: 18px; box-shadow: 0 18px 50px #0003; }
    .card strong.metric { display: block; margin-top: 8px; font-size: 28px; letter-spacing: -.04em; }
    .card-label { color: #8ea5bd; font-size: 12px; }
    .wide { min-height: 180px; }
    .split { display: grid; grid-template-columns: 1.3fr .7fr; gap: 14px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    button.primary, button.secondary, button.danger { border: 1px solid transparent; border-radius: 9px; padding: 9px 13px; color: #031522; background: #63d8ff; cursor: pointer; font: 700 13px inherit; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
    button.secondary { color: #c5e8ff; background: #173b55; border-color: #315b75; }
    button.secondary:hover:not(:disabled) { background: #20516f; border-color: #4d87a8; transform: none; }
    button.secondary:focus-visible, nav button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #7ddcff; outline-offset: 2px; }
    button.danger { color: #ffd7d7; background: #552b3a; border-color: #91455a; }
    button:disabled { opacity: .55; cursor: wait; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 620px; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #1b3550; }
    th { color: #8ea5bd; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
    td { color: #d7e8f7; }
    code, .mono { color: #9bdbff; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12px; }
    .tag { display: inline-block; color: #9bdbff; background: #123651; border: 1px solid #27516a; border-radius: 999px; padding: 3px 8px; margin: 2px 3px 2px 0; font-size: 11px; }
    .ok { color: #67e2a0; } .warn { color: #ffd27d; } .bad { color: #ff8e9e; }
    .result-row .ok, .result-row .warn, .result-row .bad { margin-left: 6px; }
    .form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; color: #8ea5bd; font-size: 12px; }
    input, select, textarea { width: 100%; border: 1px solid #2a4e6d; border-radius: 8px; padding: 10px 11px; color: #e7f0fb; background: #071522; font: inherit; }
    textarea { min-height: 70px; resize: vertical; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .alert { border: 1px solid #91455a; border-radius: 10px; padding: 10px 12px; color: #ffb9c1; background: #552b3a66; margin-bottom: 15px; }
    .token { word-break: break-all; border: 1px dashed #4bc9ff; border-radius: 10px; padding: 14px; color: #b8ecff; background: #052a4055; margin: 12px 0; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: #020812aa; backdrop-filter: blur(6px); }
    .modal { width: min(560px, 100%); border: 1px solid #3b7796; border-radius: 18px; background: #0b1b2c; padding: 22px; box-shadow: 0 30px 100px #0009; }
    .empty { padding: 28px 10px; text-align: center; color: #8ea5bd; }
    .dev-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 20px; align-items: start; }
    .dev-output { max-height: 420px; overflow: auto; white-space: pre-wrap; word-break: break-word; border: 1px solid #23415e; border-radius: 10px; padding: 14px; background: #06101b; color: #b8ecff; font: 12px/1.5 "JetBrains Mono", ui-monospace, monospace; }
    .result-list { display: grid; gap: 8px; margin-top: 14px; }
    .pack-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .pack-grid button { display: grid; gap: 5px; text-align: left; padding: 12px 13px; min-height: 72px; }
    .pack-grid small { color: #9fb8cc; line-height: 1.4; }
    .capability-toolbar { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 8px; }
    .capability-grid { display: grid; gap: 8px; max-height: 360px; overflow: auto; padding-right: 3px; }
    .capability-option { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; border: 1px solid #23415e; border-radius: 10px; padding: 10px; background: #07152299; cursor: pointer; }
    .capability-option:hover { border-color: #4bc9ff; }
    .capability-option input { width: auto; margin-top: 3px; }
    .capability-option strong { display: block; color: #d7e8f7; font-size: 12px; }
    .capability-option small { display: block; color: #8ea5bd; margin-top: 2px; }
    .capability-option.operator { opacity: .5; cursor: not-allowed; }
    .shell.light .capability-option { background: #f8fbfe; border-color: #b9cad9; }
    .shell.light .capability-option strong { color: #29445d; }
    .result-row { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; border: 1px solid #29465f; border-radius: 10px; padding: 12px 13px; background: #07152233; }
    .blocked { border-color: #805d35; background: #3a281233; }
    @keyframes boot-orbit { to { transform: rotate(360deg); } }
    @keyframes boot-pulse { 0%, 100% { transform: scale(.82); opacity: .72; } 50% { transform: scale(1.12); opacity: 1; } }
    @keyframes boot-progress { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(250%); } }
    @keyframes drift { from { transform: translate3d(-1%, -1%, 0) scale(1); } to { transform: translate3d(2%, 2%, 0) scale(1.04); } }
    @keyframes network-flow { from { transform: translate3d(-2%, -1%, 0) rotate(0deg); } to { transform: translate3d(2%, 1%, 0) rotate(2deg); } }
    @keyframes node-pulse { 0%, 100% { opacity: .45; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.25); } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .split { grid-template-columns: 1fr; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } aside { height: auto; position: static; margin-bottom: 18px; } nav { grid-template-columns: repeat(4, 1fr); } nav button { text-align: center; padding: 9px 4px; font-size: 12px; } .side-foot { display: none; } .cards { grid-template-columns: 1fr 1fr; } .topline { display: block; } .status-pill { margin-top: 16px; } }
    @media (prefers-reduced-motion: reduce) { .shell::before, .neural::before, .neural::after, .node, .boot-orbit, .boot-core, .boot-progress::before { animation: none; } *, *::before, *::after { transition-duration: .01ms !important; } }
    @media (prefers-contrast: more) { .card, aside, input, select, textarea, .result-row { border-color: currentColor; } .muted, p, label, th { color: currentColor; } .tag, button.secondary { border-color: currentColor; } }
  `;

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  get locale() { return resolveLocale(this.localeOverride, this.uiContext.locale, TRANSLATIONS); }
  t(key: string) {
    return translate(key, this.locale, [TRANSLATIONS, DEVELOPMENT_TRANSLATIONS, DEVELOPMENT_EXTRA_TRANSLATIONS, UI_TRANSLATIONS, UI_EXTRA_TRANSLATIONS], TRANSLATIONS);
  }
  setLocale(locale: string) { this.localeOverride = locale; if (locale) localStorage.setItem('gateway-locale', locale); else localStorage.removeItem('gateway-locale'); }
  get effectiveTheme() { return resolveTheme(this.uiContext.theme, Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches)); }

  async refresh() {
    this.busy = true; this.bootState = 'checking'; this.error = '';
    try { [this.ready, this.clients, this.audit, this.development, this.developmentReports, this.uiContext, this.healthDetails] = await Promise.all([api<Ready>('/../ready'), api<Client[]>('/clients'), api<AuditEvent[]>('/audit'), api<DevelopmentCatalog>('/development/catalog'), api<DevelopmentReport[]>('/development/reports'), api<UiContext>('/ui/context'), api<HealthDetails>('/health/details')]); this.bootState = 'ready'; }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorLoadState'); this.bootState = 'error'; }
    finally { this.busy = false; }
  }

  setView(view: View) { this.view = view; this.error = ''; }

  async createClient(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true; this.error = '';
    try {
      const result = await api<Client & { token: string }>('/clients', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), display_name: data.get('display_name'), profile: data.get('profile'), capabilities: [...this.selectedCapabilities] }) });
      this.issuedToken = result.token; form.reset(); this.selectedCapabilities = new Set(['ha.read.diagnostics']); await this.refresh();
    } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorIssueClient'); }
    finally { this.busy = false; }
  }

  toggleCapability(name: string, checked: boolean) {
    const next = new Set(this.selectedCapabilities);
    if (checked) next.add(name); else next.delete(name);
    this.selectedCapabilities = next;
  }

  selectObserverCapabilities() {
    this.selectedCapabilities = new Set(CAPABILITY_DEFINITIONS.filter((item) => item.group === 'observer').map((item) => item.name));
  }

  clearCapabilities() { this.selectedCapabilities = new Set(); }

  capabilityText(name: string, suffix: 'Label' | 'Description', fallback: string) {
    return resolveCapabilityText(TRANSLATIONS[this.locale], name, suffix, fallback);
  }

  statusText(status: string) { return resolveStatusText(this.t.bind(this), status); }

  operationText(operation: string, field: 'Label' | 'Description', fallback: string) {
    return resolveOperationText(this.t.bind(this), operation, field, fallback);
  }

  packText(pack: string, field: 'Label' | 'Description', fallback: string) {
    return resolvePackText(this.t.bind(this), pack, field, fallback);
  }

  capabilitySelector() {
    return html`<div class="capability-toolbar"><span class="muted">${this.selectedCapabilities.size} ${this.t('selectedCapabilities')}</span><span><button type="button" class="secondary" @click=${() => this.selectObserverCapabilities()}>${this.t('selectAllObserver')}</button> <button type="button" class="secondary" @click=${() => this.clearCapabilities()}>${this.t('clearSelection')}</button></span></div><div class="capability-grid">${CAPABILITY_DEFINITIONS.map((item) => html`<label class="capability-option ${item.group === 'operator' ? 'operator' : ''}"><input type="checkbox" .checked=${this.selectedCapabilities.has(item.name)} ?disabled=${item.group === 'operator'} @change=${(event: Event) => this.toggleCapability(item.name, (event.target as HTMLInputElement).checked)} /><span><strong>${this.capabilityText(item.name, 'Label', item.label)} · <code>${item.name}</code></strong><small>${this.capabilityText(item.name, 'Description', item.description)}</small></span></label>`)}</div>`;
  }

  async revoke(clientId: string) {
    if (!window.confirm(this.t('revokeConfirm').replace('{client}', clientId))) return;
    this.busy = true;
    try { await api<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST' }); await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorRevokeClient'); }
    finally { this.busy = false; }
  }

  async rotate(clientId: string) {
    if (!window.confirm(this.t('rotateConfirm').replace('{client}', clientId))) return;
    this.busy = true; this.error = '';
    try { const result = await api<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST' }); this.issuedToken = result.token; await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorRotateClient'); }
    finally { this.busy = false; }
  }

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.busy = true; this.error = '';
    try { this.discovery = await api<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { this.error = error instanceof Error ? error.message : this.t('errorDiscovery'); }
    finally { this.busy = false; }
  }

  async loadDevelopmentReports() {
    try { this.developmentReports = await loadDevelopmentReports(); } catch { /* execution result remains visible */ }
  }

  async startDevelopmentJob(operation: string, parameters: Record<string, string>, errorKey: string) {
    this.busy = true; this.error = ''; this.developmentProgress = { status: 'queued', completed: 0, total: 0 };
    try {
      const jobId = await queueDevelopmentJob(operation, parameters);
      await watchDevelopmentJob(jobId, {
        onSnapshot: (snapshot) => {
          this.developmentProgress = { status: snapshot.status, completed: snapshot.completed, total: snapshot.total };
          this.developmentResults = snapshot.results;
          this.developmentOutput = snapshot.results;
        },
        onFinished: () => this.loadDevelopmentReports(),
      });
    } catch (error) { this.error = error instanceof Error ? error.message : this.t(errorKey); }
    finally { this.busy = false; }
  }

  async runDevelopment(operation: string) {
    const parameters: Record<string, string> = {};
    const definition = this.development?.operations.find((item) => item.name === operation);
    if (definition?.supports_entity_id && this.developmentEntity) parameters.entity_id = this.developmentEntity;
    if (definition?.supports_start_time && this.developmentStartTime) parameters.start_time = this.developmentStartTime;
    await this.startDevelopmentJob(operation, parameters, 'errorProbe');
  }

  async runAllDevelopment() {
    await this.startDevelopmentJob('all', {}, 'errorProbes');
  }

  async runDevelopmentPack(pack: string) {
    await this.startDevelopmentJob(`pack:${pack}`, {}, 'errorPack');
  }

  async copyDiagnostic(result: DevelopmentResult) {
    await copyDiagnosticFile(result);
  }

  async retryDevelopment(operation: string) {
    await this.runDevelopment(operation);
  }

  downloadDiagnostic() {
    downloadDiagnosticFile(this.healthDetails, this.developmentResults, this.developmentReports);
  }

  loadingView() {
    const failed = this.bootState === 'error';
    return html`<div class="shell ${this.effectiveTheme}"><div class="neural" aria-hidden="true"><span class="node" style="left:14%;top:24%"></span><span class="node" style="left:31%;top:12%;animation-delay:1s"></span><span class="node" style="left:52%;top:28%;animation-delay:2s"></span><span class="node" style="left:76%;top:18%;animation-delay:.5s"></span><span class="node" style="left:88%;top:44%;animation-delay:1.7s"></span><span class="node" style="left:24%;top:68%;animation-delay:2.4s"></span><span class="node" style="left:61%;top:74%;animation-delay:1.2s"></span></div><div class="grid"></div><main class="boot-stage" aria-busy=${failed ? 'false' : 'true'}><section class="boot-card" aria-live="polite"><div class="boot-orbit" aria-hidden="true"><div class="boot-core"></div></div><h1>${failed ? this.t('errorLoadState') : this.t('checkingGateway')}</h1><p>${this.t('healthDescription')}</p>${failed ? html`<div class="alert" role="alert" style="margin-top:20px">${this.error}</div><button class="secondary boot-retry" @click=${() => void this.refresh()}>${this.t('refresh')}</button>` : html`<div class="boot-status"><span class="dot"></span>${this.t('checkingGateway')}</div><div class="boot-progress" role="progressbar" aria-label=${this.t('checkingGateway')}></div>`}</section></main></div>`;
  }

  render() {
    if (this.bootState !== 'ready') return this.loadingView();
    const active = this.view;
    return html`<div class="shell ${this.effectiveTheme}"><div class="neural" aria-hidden="true"><span class="node" style="left:14%;top:24%"></span><span class="node" style="left:31%;top:12%;animation-delay:1s"></span><span class="node" style="left:52%;top:28%;animation-delay:2s"></span><span class="node" style="left:76%;top:18%;animation-delay:.5s"></span><span class="node" style="left:88%;top:44%;animation-delay:1.7s"></span><span class="node" style="left:24%;top:68%;animation-delay:2.4s"></span><span class="node" style="left:61%;top:74%;animation-delay:1.2s"></span></div><div class="grid"></div><div class="layout">
      <aside>
        <div class="brand"><div class="brand-mark">⌁</div><div><strong>${this.t('gateway')}</strong><small> ${this.t('controlPlane')}</small></div></div>
        <nav aria-label=${this.t('navigation')}>
          ${this.nav('overview', '◈', this.t('overview'))}${this.nav('development', '⚗', this.t('development'))}${this.nav('clients', '◎', this.t('clients'))}${this.nav('policy', '◇', this.t('policy'))}${this.nav('mcp', '⌁', this.t('mcp'))}${this.nav('audit', '◌', this.t('audit'))}
        </nav>
        <div class="side-foot"><div class="ok">● ${this.t('observerFirst')}</div><div>${this.t('operatorDisabled')}</div></div>
      </aside>
      <main aria-busy=${this.busy ? 'true' : 'false'}>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div><div style="display:grid;gap:10px;justify-items:end"><label class="muted">${this.t('language')}<select aria-label=${this.t('language')} @change=${(event: Event) => this.setLocale((event.target as HTMLSelectElement).value)}><option value="">Home Assistant (${this.uiContext.locale})</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="pt">Português</option><option value="it">Italiano</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ru">Русский</option><option value="hi">हिन्दी</option><option value="ar">العربية</option></select></label><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? this.t('gatewayReady') : this.t('checkingGateway')}</div></div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? html`${this.overview()}${this.healthPanel()}${this.topologyPanel()}` : active === 'development' ? this.developmentView() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : active === 'mcp' ? this.mcpView() : this.auditView()}
      </main>
    </div>${this.issuedToken ? this.tokenModal() : ''}</div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return pageTitle(this.t.bind(this), this.view); }
  subtitle() { return pageSubtitle(this.t.bind(this), this.view); }

  overview() { const active = this.clients.filter((client) => client.status === 'active').length; return html`<section class="cards"><div class="card"><span class="card-label">${this.t('storage')}</span><strong class="metric ok">${this.ready?.storage ?? '—'}</strong><p>${this.t('privateState')}</p></div><div class="card"><span class="card-label">${this.t('homeAssistant')}</span><strong class="metric ${this.ready?.home_assistant === 'ready' ? 'ok' : 'warn'}">${this.statusText(this.ready?.home_assistant ?? 'unknown')}</strong><p>${this.t('supervisorUpstream')}</p></div><div class="card"><span class="card-label">${this.t('activeClients')}</span><strong class="metric">${active}</strong><p>${this.t('bearerIdentities')}</p></div><div class="card"><span class="card-label">${this.t('auditEvents')}</span><strong class="metric">${this.audit.length}</strong><p>${this.t('sanitizedRecords')}</p></div></section><div class="split"><div class="card wide"><h2>${this.t('systemPosture')}</h2><p>${this.t('postureDescription')}</p><div style="margin-top:22px"><span class="tag">${this.t('ingressTrusted')}</span><span class="tag">${this.t('tokenDigests')}</span><span class="tag">${this.t('readOnlyMcp')}</span></div></div><div class="card wide"><h2>${this.t('quickActions')}</h2><div class="form-actions" style="justify-content:flex-start; margin-top:24px"><button class="primary" @click=${() => this.setView('clients')}>${this.t('manageClients')}</button><button class="secondary" @click=${() => this.setView('audit')}>${this.t('viewAudit')}</button></div></div></div>`; }

  healthPanel() { return html`<section class="card" style="margin-top:14px"><div class="toolbar"><div><h2>${this.t('upstreamHealth')}</h2><p>${this.t('healthDescription')}</p></div><span class="tag ${this.healthDetails.status === 'ready' ? 'ok' : this.healthDetails.status === 'degraded' ? 'warn' : 'bad'}">${this.statusText(this.healthDetails.status)}</span></div><div class="result-list">${this.healthDetails.checks.map((check) => html`<div class="result-row"><span><strong>${check.name}</strong> <span class=${check.status === 'ok' ? 'ok' : 'bad'}>${this.statusText(check.status)}</span></span><span class="mono">${check.latency_ms} ms · ${check.http_status ?? 'transport'}${check.code ? ` · ${check.code}` : ''}</span></div>`)}</div></section>`; }

  topologyPanel() { const status = (name: string) => this.healthDetails.checks.find((check) => check.name === name)?.status ?? 'unknown'; const node = (label: string, value: string) => html`<div class="card" style="text-align:center"><strong>${label}</strong><div class="tag ${value === 'ok' || value === 'ready' ? 'ok' : value === 'unknown' ? '' : 'warn'}" style="margin-top:10px">${this.statusText(value)}</div></div>`; return html`<section class="card" style="margin-top:14px"><div class="toolbar"><div><h2>${this.t('systemTopology')}</h2><p>${this.t('topologyDescription')}</p></div><span class="mono">${this.t('topologyIngress')} → ${this.t('topologyGateway')} → ${this.t('topologyUpstream')}</span></div><div class="cards" style="grid-template-columns:repeat(5,minmax(0,1fr));margin:0"><div class="card" style="text-align:center"><strong>${this.t('topologyIngress')}</strong><div class="tag ok" style="margin-top:10px">${this.t('trusted')}</div></div>${node(this.t('topologyGateway'), this.ready?.status ?? 'unknown')}${node(this.t('topologyCore'), status('core'))}${node(this.t('topologyRecorder'), status('recorder'))}${node(this.t('topologyLogbook'), status('logbook'))}</div></section>`; }

  developmentView() {
    const catalog = this.development;
    return html`<div class="dev-grid">
      <div class="card">
        <div class="toolbar"><div><h2>${this.t('observerProbes')}</h2><p>${this.t('internalSurface')}</p></div><button class="primary" @click=${() => void this.runAllDevelopment()} ?disabled=${this.busy || !catalog?.enabled}>${this.t('runAll')}</button></div>
        <div class="pack-grid">${catalog?.packs.map((pack) => html`<button class="secondary" @click=${() => void this.runDevelopmentPack(pack.name)} ?disabled=${this.busy || !catalog.enabled}><strong>${this.packText(pack.name, 'Label', pack.label)}</strong><small>${this.packText(pack.name, 'Description', pack.description)}</small></button>`)}</div>
        <p>${this.t('devUpstreamStatus')}: <span class=${catalog?.upstream === 'ready' ? 'ok' : 'warn'}>${this.statusText(catalog?.upstream ?? 'loading')}</span>.</p>
        <div class="form" style="margin-top:16px">
          <label>${this.t('entityFilter')}<input .value=${this.developmentEntity} @input=${(event: Event) => { this.developmentEntity = (event.target as HTMLInputElement).value; }} placeholder=${this.t('devEntityPlaceholder')} /></label>
          <label>${this.t('startTime')}<input .value=${this.developmentStartTime} @input=${(event: Event) => { this.developmentStartTime = (event.target as HTMLInputElement).value; }} placeholder=${this.t('devStartTimePlaceholder')} /></label>
        </div>
        <div class="result-list">${catalog?.operations.map((operation) => html`<div class="result-row"><div><strong>${this.operationText(operation.name, 'Label', operation.label)}</strong><br><span class="muted">${this.operationText(operation.name, 'Description', operation.description)}</span></div><button class="secondary" @click=${() => void this.runDevelopment(operation.name)} ?disabled=${this.busy || !catalog.enabled}>${this.t('run')}</button></div>`)}</div>
      </div>
      <div class="card">
        <div class="toolbar"><div><h2>${this.t('executionEvidence')}</h2><p>${this.t('countLatency')}</p></div><div>${this.developmentProgress.total ? html`<span class="tag ${this.developmentProgress.status === 'error' ? 'bad' : this.developmentProgress.status === 'warning' ? 'warn' : ''}" aria-live="polite">${this.developmentProgress.completed}/${this.developmentProgress.total}</span>` : ''}${this.developmentResults.length ? html`<span class="tag">${this.developmentResults.length} ${this.t('result')}</span>` : ''}<button class="secondary" @click=${() => this.downloadDiagnostic()}>${this.t('exportDiagnostic')}</button></div></div>
        ${this.developmentResults.length ? html`<div class="result-list">${this.developmentResults.map((result) => html`<div class="result-row"><span><strong>${this.operationText(result.operation, 'Label', result.operation)}</strong> <span class=${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'bad'}>${this.statusText(result.status)}</span></span><span class="mono">${result.count} ${this.t('devItems')} · ${result.duration_ms} ${this.t('devMilliseconds')} ${result.status !== 'ok' ? html`<button class="secondary" @click=${() => void this.copyDiagnostic(result)}>${this.t('copyDiagnostic')}</button><button class="secondary" @click=${() => void this.retryDevelopment(result.operation)}>${this.t('retry')}</button>` : ''}</span></div>`)}</div><pre class="dev-output">${JSON.stringify(this.developmentOutput, null, 2)}</pre>` : html`<div class="empty">${this.t('exactResponse')}</div>`}
        ${this.developmentReports.length ? html`<h3 style="margin-top:18px">${this.t('historicalEvidenceLabel')}</h3><div class="result-list">${this.developmentReports.map((report) => html`<div class="result-row"><span><strong>${this.operationText(report.operation, 'Label', report.operation)}</strong> <span class=${report.status === 'ok' ? 'ok' : 'warn'}>${this.statusText(report.status)}</span><br><span class="muted">${new Date(report.occurred_at).toLocaleString()} · ${report.schema_fingerprint.slice(0, 12)}</span></span><span class="mono">${report.total_count} ${this.t('devItems')}${report.comparison ? ` · Δ ${report.comparison.count_delta}` : ''}${report.comparison?.schema_changed ? ` · ${this.t('devSchemaChanged')}` : ''}${report.comparison_details?.regressions?.length ? ` · ⚠ ${report.comparison_details.regressions.length} ${this.t('devRegressions')}` : ''}</span></div>`)}</div>` : ''}
        <div class="card blocked" style="margin-top:14px"><h3>${this.t('mutationProbes')}</h3><p><span class="warn">${this.t('mutationsBlocked')}</span></p><div style="margin-top:10px"><span class="tag">${this.t('approvalRequired')}</span><span class="tag">${this.t('operatorDisabledTag')}</span><span class="tag">${this.t('noMcpMutation')}</span></div></div>
      </div>
    </div>`;
  }

  clientsView() { return html`<div class="split"><div class="card"><div class="toolbar"><div><h2>${this.t('registeredClients')}</h2><p>${this.t('tokensNotListed')}</p></div><button class="secondary" @click=${() => void this.refresh()} ?disabled=${this.busy}>${this.t('refresh')}</button></div>${this.clients.length ? html`<div class="table-wrap"><table><thead><tr><th>${this.t('identity')}</th><th>${this.t('profile')}</th><th>${this.t('capabilities')}</th><th>${this.t('status')}</th><th></th></tr></thead><tbody>${this.clients.map((client) => html`<tr><td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td><td><span class="tag">${client.profile}</span></td><td>${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</td><td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td><td>${client.status === 'active' ? html`<button class="danger" @click=${() => void this.revoke(client.client_id)} ?disabled=${this.busy}>${this.t('revoke')}</button><button class="secondary" @click=${() => void this.rotate(client.client_id)} ?disabled=${this.busy}>${this.t('rotate')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">${this.t('noClientsIssued')}</div>`}</div><div class="card"><h2>${this.t('issueObserverClient')}</h2><p style="margin-bottom:16px">${this.t('tokenShownOnce')}</p><form class="form" @submit=${this.createClient}><label>${this.t('clientId')}<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label><label>${this.t('displayName')}<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label><label>Profile<select name="profile"><option value="observer">observer · read-only</option><option value="operator" disabled>operator · disabled</option></select></label><label>${this.t('capabilities')}<small class="muted">${this.t('capabilitiesHelp')}</small>${this.capabilitySelector()}</label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>${this.t('issueClient')}</button></div></form></div></div>`; }

  auditView() { return html`<div class="card"><div class="toolbar"><div><h2>${this.t('auditEvents')}</h2><p>${this.t('auditNotStored')}</p></div><div><select @change=${(event: Event) => this.loadAudit((event.target as HTMLSelectElement).value)}><option value="">${this.t('allDecisions')}</option><option value="allowed">${this.t('allowed')}</option><option value="denied">${this.t('denied')}</option><option value="approval_required">${this.t('approvalRequiredOption')}</option></select></div></div>${this.audit.length ? html`<div class="table-wrap"><table><thead><tr><th>${this.t('time')}</th><th>${this.t('action')}</th><th>${this.t('target')}</th><th>${this.t('decision')}</th><th>${this.t('outcome')}</th><th>${this.t('requestId')}</th></tr></thead><tbody>${this.audit.map((event) => html`<tr><td class="mono">${new Date(event.occurred_at).toLocaleString()}</td><td>${event.action}</td><td class="mono">${event.target}</td><td class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</td><td>${event.outcome} · ${event.status_code}</td><td class="mono">${event.request_id}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">${this.t('noAudit')}</div>`}</div>`; }

  async loadAudit(decision: string) { this.busy = true; try { this.audit = await api<AuditEvent[]>(`/audit?limit=100${decision ? `&decision=${encodeURIComponent(decision)}` : ''}`); } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorAudit'); } finally { this.busy = false; } }
  policyView() { return html`<div class="split"><div class="card"><h2>${this.t('policyMatrix')}</h2><p>${this.t('policySubtitle')}</p><div style="margin-top:20px"><div class="tag">${this.t('policyReadAllowed')}</div><div class="tag">${this.t('policyMissingDenied')}</div><div class="tag">${this.t('policyMutationDenied')}</div><div class="tag">${this.t('policyOperatorDisabled')}</div></div></div><div class="card"><h2>${this.t('evaluateRequest')}</h2><form class="form" @submit=${this.evaluatePolicy}><label>${this.t('client')}<select name="client_id">${this.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>${this.t('capability')}<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> ${this.t('mutationRequest')}</span></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>${this.t('evaluate')}</button></div></form></div></div>`; }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.busy = true; try { const result = await api<{ decision: string; reason: string }>('/policy/evaluate', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), capability: data.get('capability'), mutation: data.has('mutation') }) }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = error instanceof Error ? error.message : this.t('errorPolicy'); } finally { this.busy = false; } }
  mcpView() { return html`<div class="split"><div class="card"><h2>${this.t('streamableHttp')}</h2><p>${this.t('authenticatedEndpoint')}</p><div class="token mono" style="margin-top:20px">/mcp/</div><p>${this.t('transport')}: <span class="ok">${this.ready?.mcp ?? 'unknown'}</span></p><p style="margin-top:8px">${this.t('tool')}: <code>gateway_diagnostics</code></p></div><div class="card"><h2>${this.t('discovery')}</h2><p style="margin-bottom:16px">${this.t('mcpSubtitle')}</p><form class="form" @submit=${this.loadDiscovery}><label>${this.t('bearerToken')}<input name="token" type="password" required placeholder="hgw_…" /></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>${this.t('loadDiscovery')}</button></div></form>${this.discovery ? html`<div style="margin-top:18px"><span class="tag">${this.discovery.client_id}</span><span class="tag">${this.discovery.profile}</span>${this.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`; }
  tokenModal() { return html`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="eyebrow">${this.t('oneTimeCredential')}</div><h2>${this.t('tokenOnce')}</h2><p>${this.t('tokenOnlyOnce')}</p><div class="token mono">${this.issuedToken}</div><div class="form-actions"><button class="secondary" @click=${() => navigator.clipboard?.writeText(this.issuedToken)}>${this.t('copyToken')}</button><button class="primary" @click=${() => { this.issuedToken = ''; }}>${this.t('savedIt')}</button></div></div></div>`; }
}

customElements.define('gateway-app', GatewayApp);
