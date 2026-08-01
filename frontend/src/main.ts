import { LitElement, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';

type Profile = 'observer' | 'operator';
type Client = {
  client_id: string;
  display_name: string;
  profile: Profile;
  capabilities: string[];
  created_at: string;
  status: string;
  revoked_at: string | null;
};
type Ready = { status: string; storage: string; mcp: string; home_assistant: string };
type HealthCheck = { name: string; status: string; latency_ms: number; http_status: number | null; code: string | null };
type HealthDetails = { status: string; checks: HealthCheck[] };
type AuditEvent = { event_id: string; occurred_at: string; request_id: string; remote_user_id: string | null; action: string; target: string; decision: string; outcome: string; status_code: number };
type Discovery = { server_name: string; transport: string; endpoint: string; client_id: string; profile: Profile; capabilities: string[]; tools: string[] };
type DevelopmentOperation = { name: string; label: string; description: string; kind: string; supports_entity_id: boolean; supports_start_time: boolean };
type DevelopmentPack = { name: string; label: string; description: string; operations: string[] };
type DevelopmentResult = { status: string; operation: string; duration_ms: number; count: number; data?: unknown; reason?: string | null };
type DevelopmentReport = { report_id: string; occurred_at: string; operation: string; status: string; duration_ms: number; total_count: number; schema_fingerprint: string; comparison?: { previous_report_id: string; count_delta: number; schema_changed: boolean } | null; comparison_details?: { regressions?: { operation: string; kind: string; from: string; to: string }[] } | null };
type DevelopmentCatalog = { enabled: boolean; upstream: string; operations: DevelopmentOperation[]; packs: DevelopmentPack[]; mutations: { status: string; reason: string; approval_required: boolean } };
type UiContext = { locale: string; theme: 'light' | 'dark' | 'auto' };

type View = 'overview' | 'clients' | 'policy' | 'mcp' | 'audit' | 'development';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    gateway: 'Gateway', controlPlane: 'control plane', overview: 'Overview', development: 'Dev Console', clients: 'Clients', policy: 'Policy', mcp: 'MCP', audit: 'Audit',
    observerFirst: 'observer-first', operatorDisabled: 'Operator capabilities disabled', gatewayReady: 'Gateway ready', checkingGateway: 'Checking gateway',
    developmentTitle: 'Development Console', runAll: 'Run all', observerProbes: 'Observer probes', executionEvidence: 'Execution evidence', historicalEvidence: 'Historical evidence',
    countLatency: 'Count, latency, status and sanitized payload.', internalSurface: 'Internal Ingress-only verification surface.', runProbe: 'Run', entityFilter: 'Entity filter', startTime: 'Start time',
    exactResponse: 'Run a probe to inspect the exact adapter response.', blocked: 'Blocked by design.', approvalRequired: 'approval required', operatorDisabledTag: 'operator disabled', noMcpMutation: 'no MCP mutation',
    overviewTitle: 'Secure gateway control plane.', developmentSubtitle: 'Run every observer probe internally and see exactly where retrieval succeeds or fails.',
    clientsTitle: 'Clients & tokens', policyTitle: 'Profiles & policy', mcpTitle: 'MCP transport', auditTitle: 'Sanitized audit trail',
  },
  es: {
    gateway: 'Gateway', controlPlane: 'panel de control', overview: 'Resumen', development: 'Consola de desarrollo', clients: 'Clientes', policy: 'Política', mcp: 'MCP', audit: 'Auditoría',
    observerFirst: 'solo observador', operatorDisabled: 'Capacidades operator desactivadas', gatewayReady: 'Gateway listo', checkingGateway: 'Comprobando gateway',
    developmentTitle: 'Consola de desarrollo', runAll: 'Ejecutar todo', observerProbes: 'Pruebas observer', executionEvidence: 'Evidencia de ejecución', historicalEvidence: 'Evidencia histórica',
    countLatency: 'Cantidad, latencia, estado y payload sanitizado.', internalSurface: 'Superficie interna protegida por Ingress.', runProbe: 'Ejecutar', entityFilter: 'Filtro de entidad', startTime: 'Hora de inicio',
    exactResponse: 'Ejecuta una prueba para inspeccionar la respuesta exacta del adaptador.', blocked: 'Bloqueado por diseño.', approvalRequired: 'aprobación requerida', operatorDisabledTag: 'operator desactivado', noMcpMutation: 'sin mutaciones MCP',
    overviewTitle: 'Panel de control seguro.', developmentSubtitle: 'Ejecuta internamente las pruebas observer y comprueba exactamente qué lecturas funcionan o fallan.',
    clientsTitle: 'Clientes y tokens', policyTitle: 'Perfiles y política', mcpTitle: 'Transporte MCP', auditTitle: 'Auditoría sanitizada',
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

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(new URL(`./api${path}`, document.baseURI), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
};

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
  @state() developmentOutput: unknown = null;
  @state() developmentEntity = '';
  @state() developmentStartTime = '';

  static styles = css`
    :host { display: block; color: #e7f0fb; min-height: 100vh; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .shell { min-height: 100vh; position: relative; overflow: hidden; background: #07111f; }
    .shell.light { color: #243447; background: #f4f7fb; }
    .shell.light aside, .shell.light .card { background: #ffffffee; border-color: #d3deea; box-shadow: 0 18px 50px #38516b14; }
    .shell.light p, .shell.light .muted, .shell.light .brand small, .shell.light .card-label, .shell.light .side-foot, .shell.light nav button { color: #607286; }
    .shell.light nav button:hover, .shell.light nav button.active { color: #17324d; background: #dceefa; }
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
    button.primary, button.secondary, button.danger { border: 1px solid transparent; border-radius: 9px; padding: 9px 13px; color: #031522; background: #63d8ff; cursor: pointer; font: 700 13px inherit; }
    button.secondary { color: #c5e8ff; background: #123651; border-color: #2b6184; }
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
    .dev-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; }
    .dev-output { max-height: 420px; overflow: auto; white-space: pre-wrap; word-break: break-word; border: 1px solid #23415e; border-radius: 10px; padding: 14px; background: #06101b; color: #b8ecff; font: 12px/1.5 "JetBrains Mono", ui-monospace, monospace; }
    .result-list { display: grid; gap: 8px; margin-top: 14px; }
    .pack-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .pack-grid button { display: grid; gap: 3px; text-align: left; }
    .pack-grid small { color: #8ea5bd; }
    .result-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; border: 1px solid #1b3550; border-radius: 9px; padding: 9px 10px; }
    .blocked { border-color: #805d35; background: #3a281233; }
    @keyframes drift { from { transform: translate3d(-1%, -1%, 0) scale(1); } to { transform: translate3d(2%, 2%, 0) scale(1.04); } }
    @keyframes network-flow { from { transform: translate3d(-2%, -1%, 0) rotate(0deg); } to { transform: translate3d(2%, 1%, 0) rotate(2deg); } }
    @keyframes node-pulse { 0%, 100% { opacity: .45; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.25); } }
    @media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } .split { grid-template-columns: 1fr; } }
    @media (max-width: 720px) { .layout { width: min(100% - 24px, 600px); display: block; padding-top: 12px; } aside { height: auto; position: static; margin-bottom: 18px; } nav { grid-template-columns: repeat(4, 1fr); } nav button { text-align: center; padding: 9px 4px; font-size: 12px; } .side-foot { display: none; } .cards { grid-template-columns: 1fr 1fr; } .topline { display: block; } .status-pill { margin-top: 16px; } }
    @media (prefers-reduced-motion: reduce) { .shell::before, .neural::before, .neural::after, .node { animation: none; } *, *::before, *::after { transition-duration: .01ms !important; } }
    @media (prefers-contrast: more) { .card, aside, input, select, textarea, .result-row { border-color: currentColor; } .muted, p, label, th { color: currentColor; } .tag, button.secondary { border-color: currentColor; } }
  `;

  connectedCallback() { super.connectedCallback(); void this.refresh(); }

  get locale() { const base = (this.localeOverride || this.uiContext.locale).toLowerCase().split('-', 1)[0]; return TRANSLATIONS[base] ? base : 'en'; }
  t(key: string) { return TRANSLATIONS[this.locale]?.[key] ?? TRANSLATIONS.en[key] ?? key; }
  setLocale(locale: string) { this.localeOverride = locale; if (locale) localStorage.setItem('gateway-locale', locale); else localStorage.removeItem('gateway-locale'); }
  get effectiveTheme() { return this.uiContext.theme === 'auto' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : this.uiContext.theme; }

  async refresh() {
    this.busy = true; this.error = '';
    try { [this.ready, this.clients, this.audit, this.development, this.developmentReports, this.uiContext, this.healthDetails] = await Promise.all([api<Ready>('/../ready'), api<Client[]>('/clients'), api<AuditEvent[]>('/audit'), api<DevelopmentCatalog>('/development/catalog'), api<DevelopmentReport[]>('/development/reports'), api<UiContext>('/ui/context'), api<HealthDetails>('/health/details')]); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load gateway state'; }
    finally { this.busy = false; }
  }

  setView(view: View) { this.view = view; this.error = ''; }

  async createClient(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true; this.error = '';
    try {
      const result = await api<Client & { token: string }>('/clients', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), display_name: data.get('display_name'), profile: data.get('profile'), capabilities: String(data.get('capabilities') ?? '').split(',').map((item) => item.trim()).filter(Boolean) }) });
      this.issuedToken = result.token; form.reset(); await this.refresh();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to issue client'; }
    finally { this.busy = false; }
  }

  async revoke(clientId: string) {
    if (!window.confirm(`Revoke client ${clientId}? This cannot be undone.`)) return;
    this.busy = true;
    try { await api<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST' }); await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to revoke client'; }
    finally { this.busy = false; }
  }

  async rotate(clientId: string) {
    if (!window.confirm(`Rotate credentials for ${clientId}? The current token will stop working.`)) return;
    this.busy = true; this.error = '';
    try { const result = await api<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST' }); this.issuedToken = result.token; await this.refresh(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to rotate client'; }
    finally { this.busy = false; }
  }

  async loadDiscovery(event: Event) {
    event.preventDefault(); const form = event.target as HTMLFormElement; const token = String(new FormData(form).get('token') ?? '');
    this.busy = true; this.error = '';
    try { this.discovery = await api<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load discovery'; }
    finally { this.busy = false; }
  }

  async loadDevelopmentReports() {
    try { this.developmentReports = await api<DevelopmentReport[]>('/development/reports'); } catch { /* execution result remains visible */ }
  }

  async runDevelopment(operation: string) {
    this.busy = true; this.error = '';
    const parameters: Record<string, string> = {};
    const definition = this.development?.operations.find((item) => item.name === operation);
    if (definition?.supports_entity_id && this.developmentEntity) parameters.entity_id = this.developmentEntity;
    if (definition?.supports_start_time && this.developmentStartTime) parameters.start_time = this.developmentStartTime;
    try {
      const result = await api<DevelopmentResult>('/development/run', { method: 'POST', body: JSON.stringify({ operation, parameters }) });
      this.developmentResults = [result]; this.developmentOutput = result.data ?? result; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development probe'; }
    finally { this.busy = false; }
  }

  async runAllDevelopment() {
    this.busy = true; this.error = '';
    try {
      const result = await api<{ status: string; operation: string; results: DevelopmentResult[] }>('/development/run', { method: 'POST', body: JSON.stringify({ operation: 'all', parameters: {} }) });
      this.developmentResults = result.results; this.developmentOutput = result.results; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development probes'; }
    finally { this.busy = false; }
  }

  async runDevelopmentPack(pack: string) {
    this.busy = true; this.error = '';
    try {
      const result = await api<{ status: string; operation: string; results: DevelopmentResult[] }>('/development/run', { method: 'POST', body: JSON.stringify({ operation: `pack:${pack}`, parameters: {} }) });
      this.developmentResults = result.results; this.developmentOutput = result.results; await this.loadDevelopmentReports();
    } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to run development pack'; }
    finally { this.busy = false; }
  }

  async copyDiagnostic(result: DevelopmentResult) {
    await navigator.clipboard?.writeText(JSON.stringify({ operation: result.operation, status: result.status, reason: result.reason ?? null }, null, 2));
  }

  async retryDevelopment(operation: string) {
    await this.runDevelopment(operation);
  }

  downloadDiagnostic() {
    const payload = { generated_at: new Date().toISOString(), health: this.healthDetails, results: this.developmentResults, reports: this.developmentReports.slice(0, 10) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `homeassistant-gateway-diagnostic-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  render() {
    const active = this.view;
    return html`<div class="shell ${this.effectiveTheme}"><div class="neural" aria-hidden="true"><span class="node" style="left:14%;top:24%"></span><span class="node" style="left:31%;top:12%;animation-delay:1s"></span><span class="node" style="left:52%;top:28%;animation-delay:2s"></span><span class="node" style="left:76%;top:18%;animation-delay:.5s"></span><span class="node" style="left:88%;top:44%;animation-delay:1.7s"></span><span class="node" style="left:24%;top:68%;animation-delay:2.4s"></span><span class="node" style="left:61%;top:74%;animation-delay:1.2s"></span></div><div class="grid"></div><div class="layout">
      <aside>
        <div class="brand"><div class="brand-mark">⌁</div><div><strong>${this.t('gateway')}</strong><small> ${this.t('controlPlane')}</small></div></div>
        <nav aria-label="Gateway navigation">
          ${this.nav('overview', '◈', this.t('overview'))}${this.nav('development', '⚗', this.t('development'))}${this.nav('clients', '◎', this.t('clients'))}${this.nav('policy', '◇', this.t('policy'))}${this.nav('mcp', '⌁', this.t('mcp'))}${this.nav('audit', '◌', this.t('audit'))}
        </nav>
        <div class="side-foot"><div class="ok">● ${this.t('observerFirst')}</div><div>${this.t('operatorDisabled')}</div></div>
      </aside>
      <main aria-busy=${this.busy ? 'true' : 'false'}>
        <div class="topline"><div><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>${this.pageTitle()}</h1><p>${this.subtitle()}</p></div><div style="display:grid;gap:10px;justify-items:end"><label class="muted">Language<select aria-label="Language" @change=${(event: Event) => this.setLocale((event.target as HTMLSelectElement).value)}><option value="">Home Assistant (${this.uiContext.locale})</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="pt">Português</option><option value="it">Italiano</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ru">Русский</option><option value="hi">हिन्दी</option><option value="ar">العربية</option></select></label><div class="status-pill ${this.ready?.status === 'ready' ? '' : 'warn'}"><span class="dot"></span>${this.ready?.status === 'ready' ? this.t('gatewayReady') : this.t('checkingGateway')}</div></div></div>
        ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : ''}
        ${active === 'overview' ? html`${this.overview()}${this.healthPanel()}${this.topologyPanel()}` : active === 'development' ? this.developmentView() : active === 'clients' ? this.clientsView() : active === 'policy' ? this.policyView() : active === 'mcp' ? this.mcpView() : this.auditView()}
      </main>
    </div>${this.issuedToken ? this.tokenModal() : ''}</div>`;
  }

  nav(view: View, icon: string, label: string) { return html`<button class=${this.view === view ? 'active' : ''} @click=${() => this.setView(view)}><span aria-hidden="true">${icon}</span> ${label}</button>`; }
  pageTitle() { return ({ overview: this.t('overviewTitle'), development: this.t('developmentTitle'), clients: this.t('clientsTitle'), policy: this.t('policyTitle'), mcp: this.t('mcpTitle'), audit: this.t('auditTitle') } as Record<View, string>)[this.view]; }
  subtitle() { return ({ overview: 'A quiet observatory for identity, readiness and read-only access.', development: this.t('developmentSubtitle'), clients: 'Issue independent credentials and revoke them without exposing stored secrets.', policy: 'Review the capability boundaries enforced before any MCP operation.', mcp: 'Inspect the authenticated Streamable HTTP surface exposed to observer clients.', audit: 'Trace decisions and outcomes without exposing request secrets.' } as Record<View, string>)[this.view]; }

  overview() { const active = this.clients.filter((client) => client.status === 'active').length; return html`<section class="cards"><div class="card"><span class="card-label">Storage</span><strong class="metric ok">${this.ready?.storage ?? '—'}</strong><p>Private SQLite state</p></div><div class="card"><span class="card-label">Home Assistant</span><strong class="metric ${this.ready?.home_assistant === 'ready' ? 'ok' : 'warn'}">${this.ready?.home_assistant ?? '—'}</strong><p>Supervisor upstream</p></div><div class="card"><span class="card-label">Active clients</span><strong class="metric">${active}</strong><p>Bearer identities</p></div><div class="card"><span class="card-label">Audit events</span><strong class="metric">${this.audit.length}</strong><p>Sanitized records</p></div></section><div class="split"><div class="card wide"><h2>System posture</h2><p>All management requests are protected by Supervisor Ingress identity. Client tokens are hashed at rest and displayed only once during issuance.</p><div style="margin-top:22px"><span class="tag">Ingress trusted identity</span><span class="tag">SHA-256 token digests</span><span class="tag">read-only MCP</span></div></div><div class="card wide"><h2>Quick actions</h2><div class="form-actions" style="justify-content:flex-start; margin-top:24px"><button class="primary" @click=${() => this.setView('clients')}>Manage clients</button><button class="secondary" @click=${() => this.setView('audit')}>View audit</button></div></div></div>`; }

  healthPanel() { return html`<section class="card" style="margin-top:14px"><div class="toolbar"><div><h2>Upstream health</h2><p>Independent checks for Home Assistant and its read resources.</p></div><span class="tag ${this.healthDetails.status === 'ready' ? 'ok' : this.healthDetails.status === 'degraded' ? 'warn' : 'bad'}">${this.healthDetails.status}</span></div><div class="result-list">${this.healthDetails.checks.map((check) => html`<div class="result-row"><span><strong>${check.name}</strong> <span class=${check.status === 'ok' ? 'ok' : 'bad'}>${check.status}</span></span><span class="mono">${check.latency_ms} ms · ${check.http_status ?? 'transport'}${check.code ? ` · ${check.code}` : ''}</span></div>`)}</div></section>`; }

  topologyPanel() { const status = (name: string) => this.healthDetails.checks.find((check) => check.name === name)?.status ?? 'unknown'; const node = (label: string, value: string) => html`<div class="card" style="text-align:center"><strong>${label}</strong><div class="tag ${value === 'ok' || value === 'ready' ? 'ok' : value === 'unknown' ? '' : 'warn'}" style="margin-top:10px">${value}</div></div>`; return html`<section class="card" style="margin-top:14px"><div class="toolbar"><div><h2>System topology</h2><p>Live dependency posture from the current health checks.</p></div><span class="mono">Ingress → gateway → upstream</span></div><div class="cards" style="grid-template-columns:repeat(5,minmax(0,1fr));margin:0"><div class="card" style="text-align:center"><strong>Ingress</strong><div class="tag ok" style="margin-top:10px">trusted</div></div>${node('Gateway', this.ready?.status ?? 'unknown')}${node('Core', status('core'))}${node('Recorder', status('recorder'))}${node('Logbook', status('logbook'))}</div></section>`; }

  developmentView() {
    const catalog = this.development;
    return html`<div class="dev-grid">
      <div class="card">
        <div class="toolbar"><div><h2>${this.t('observerProbes')}</h2><p>${this.t('internalSurface')}</p></div><button class="primary" @click=${() => void this.runAllDevelopment()} ?disabled=${this.busy || !catalog?.enabled}>${this.t('runAll')}</button></div>
        <div class="pack-grid">${catalog?.packs.map((pack) => html`<button class="secondary" @click=${() => void this.runDevelopmentPack(pack.name)} ?disabled=${this.busy || !catalog.enabled}><strong>${pack.label}</strong><small>${pack.description}</small></button>`)}</div>
        <p>Upstream: <span class=${catalog?.upstream === 'ready' ? 'ok' : 'warn'}>${catalog?.upstream ?? 'loading'}</span>. Each probe uses the same read adapter that MCP clients use.</p>
        <div class="form" style="margin-top:16px">
          <label>${this.t('entityFilter')}<input .value=${this.developmentEntity} @input=${(event: Event) => { this.developmentEntity = (event.target as HTMLInputElement).value; }} placeholder="light.kitchen (optional)" /></label>
          <label>${this.t('startTime')}<input .value=${this.developmentStartTime} @input=${(event: Event) => { this.developmentStartTime = (event.target as HTMLInputElement).value; }} placeholder="2026-08-01T00:00:00Z (optional)" /></label>
        </div>
        <div class="result-list">${catalog?.operations.map((operation) => html`<div class="result-row"><div><strong>${operation.label}</strong><br><span class="muted">${operation.description}</span></div><button class="secondary" @click=${() => void this.runDevelopment(operation.name)} ?disabled=${this.busy || !catalog.enabled}>Run</button></div>`)}</div>
      </div>
      <div class="card">
        <div class="toolbar"><div><h2>${this.t('executionEvidence')}</h2><p>${this.t('countLatency')}</p></div><div>${this.developmentResults.length ? html`<span class="tag">${this.developmentResults.length} result(s)</span>` : ''}<button class="secondary" @click=${() => this.downloadDiagnostic()}>Export diagnostic</button></div></div>
        ${this.developmentResults.length ? html`<div class="result-list">${this.developmentResults.map((result) => html`<div class="result-row"><span><strong>${result.operation}</strong> <span class=${result.status === 'ok' ? 'ok' : 'bad'}>${result.status}</span></span><span class="mono">${result.count} items · ${result.duration_ms} ms ${result.status !== 'ok' ? html`<button class="secondary" @click=${() => void this.copyDiagnostic(result)}>Copy diagnostic</button><button class="secondary" @click=${() => void this.retryDevelopment(result.operation)}>Retry</button>` : ''}</span></div>`)}</div><pre class="dev-output">${JSON.stringify(this.developmentOutput, null, 2)}</pre>` : html`<div class="empty">${this.t('exactResponse')}</div>`}
        ${this.developmentReports.length ? html`<h3 style="margin-top:18px">Historical evidence</h3><div class="result-list">${this.developmentReports.map((report) => html`<div class="result-row"><span><strong>${report.operation}</strong> <span class=${report.status === 'ok' ? 'ok' : 'warn'}>${report.status}</span><br><span class="muted">${new Date(report.occurred_at).toLocaleString()} · ${report.schema_fingerprint.slice(0, 12)}</span></span><span class="mono">${report.total_count} items${report.comparison ? ` · Δ ${report.comparison.count_delta}` : ''}${report.comparison?.schema_changed ? ' · schema changed' : ''}${report.comparison_details?.regressions?.length ? ` · ⚠ ${report.comparison_details.regressions.length} regression(s)` : ''}</span></div>`)}</div>` : ''}
        <div class="card blocked" style="margin-top:14px"><h3>Mutation probes</h3><p><span class="warn">Blocked by design.</span> Configuration writes, automation changes and service calls require the future approval/idempotency/rollback flow.</p><div style="margin-top:10px"><span class="tag">approval required</span><span class="tag">operator disabled</span><span class="tag">no MCP mutation</span></div></div>
      </div>
    </div>`;
  }

  clientsView() { return html`<div class="split"><div class="card"><div class="toolbar"><div><h2>Registered clients</h2><p>Tokens never appear in this list.</p></div><button class="secondary" @click=${() => void this.refresh()} ?disabled=${this.busy}>Refresh</button></div>${this.clients.length ? html`<div class="table-wrap"><table><thead><tr><th>Identity</th><th>Profile</th><th>Capabilities</th><th>Status</th><th></th></tr></thead><tbody>${this.clients.map((client) => html`<tr><td><strong>${client.display_name}</strong><br><span class="mono">${client.client_id}</span></td><td><span class="tag">${client.profile}</span></td><td>${client.capabilities.map((capability) => html`<span class="tag">${capability}</span>`)}</td><td class=${client.status === 'active' ? 'ok' : 'bad'}>${client.status}</td><td>${client.status === 'active' ? html`<button class="danger" @click=${() => void this.revoke(client.client_id)} ?disabled=${this.busy}>Revoke</button><button class="secondary" @click=${() => void this.rotate(client.client_id)} ?disabled=${this.busy}>Rotate</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No clients issued yet.</div>`}</div><div class="card"><h2>Issue observer client</h2><p style="margin-bottom:16px">The token will be shown once after creation.</p><form class="form" @submit=${this.createClient}><label>Client ID<input name="client_id" required maxlength="128" placeholder="nido-observer" /></label><label>Display name<input name="display_name" required maxlength="256" placeholder="Nido house monitor" /></label><label>Profile<select name="profile"><option value="observer">observer · read-only</option><option value="operator" disabled>operator · disabled</option></select></label><label>Capabilities<input name="capabilities" value="ha.read.diagnostics" placeholder="ha.read.diagnostics, ha.read.states" /><small class="muted">Comma-separated capability names.</small></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Issue client</button></div></form></div></div>`; }

  auditView() { return html`<div class="card"><div class="toolbar"><div><h2>Sanitized audit events</h2><p>Request bodies, credentials, tokens and digests are never stored here.</p></div><div><select @change=${(event: Event) => this.loadAudit((event.target as HTMLSelectElement).value)}><option value="">All decisions</option><option value="allowed">Allowed</option><option value="denied">Denied</option><option value="approval_required">Approval required</option></select></div></div>${this.audit.length ? html`<div class="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Decision</th><th>Outcome</th><th>Request ID</th></tr></thead><tbody>${this.audit.map((event) => html`<tr><td class="mono">${new Date(event.occurred_at).toLocaleString()}</td><td>${event.action}</td><td class="mono">${event.target}</td><td class=${event.decision === 'allowed' ? 'ok' : event.decision === 'denied' ? 'bad' : 'warn'}>${event.decision}</td><td>${event.outcome} · ${event.status_code}</td><td class="mono">${event.request_id}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No audit events match the selected filter.</div>`}</div>`; }

  async loadAudit(decision: string) { this.busy = true; try { this.audit = await api<AuditEvent[]>(`/audit?limit=100${decision ? `&decision=${encodeURIComponent(decision)}` : ''}`); } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to load audit'; } finally { this.busy = false; } }
  policyView() { return html`<div class="split"><div class="card"><h2>Policy matrix</h2><p>Observer clients may read granted capabilities. Mutations remain denied.</p><div style="margin-top:20px"><div class="tag">read capability → allowed</div><div class="tag">missing capability → denied</div><div class="tag">observer mutation → denied</div><div class="tag">operator → globally disabled</div></div></div><div class="card"><h2>Evaluate a request</h2><form class="form" @submit=${this.evaluatePolicy}><label>Client<select name="client_id">${this.clients.map((client) => html`<option value=${client.client_id}>${client.display_name} · ${client.client_id}</option>`)}</select></label><label>Capability<input name="capability" value="ha.read.diagnostics" required /></label><label><span><input name="mutation" type="checkbox" style="width:auto; margin-right:7px" /> mutation request</span></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Evaluate</button></div></form></div></div>`; }
  async evaluatePolicy(event: Event) { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); this.busy = true; try { const result = await api<{ decision: string; reason: string }>('/policy/evaluate', { method: 'POST', body: JSON.stringify({ client_id: data.get('client_id'), capability: data.get('capability'), mutation: data.has('mutation') }) }); window.alert(`${result.decision}: ${result.reason}`); } catch (error) { this.error = error instanceof Error ? error.message : 'Unable to evaluate policy'; } finally { this.busy = false; } }
  mcpView() { return html`<div class="split"><div class="card"><h2>Streamable HTTP</h2><p>Authenticated endpoint</p><div class="token mono" style="margin-top:20px">/mcp/</div><p>Transport: <span class="ok">${this.ready?.mcp ?? 'unknown'}</span></p><p style="margin-top:8px">Tool: <code>gateway_diagnostics</code></p></div><div class="card"><h2>Discovery</h2><p style="margin-bottom:16px">Paste a client token to inspect its scoped metadata. It is sent only in the Authorization header.</p><form class="form" @submit=${this.loadDiscovery}><label>Bearer token<input name="token" type="password" required placeholder="hgw_…" /></label><div class="form-actions"><button class="primary" ?disabled=${this.busy}>Load discovery</button></div></form>${this.discovery ? html`<div style="margin-top:18px"><span class="tag">${this.discovery.client_id}</span><span class="tag">${this.discovery.profile}</span>${this.discovery.capabilities.map((item) => html`<span class="tag">${item}</span>`)}</div>` : ''}</div></div>`; }
  tokenModal() { return html`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="eyebrow">One-time credential</div><h2>Save this token now</h2><p>This is the only time the plaintext token will be shown. It will not be retrievable later.</p><div class="token mono">${this.issuedToken}</div><div class="form-actions"><button class="secondary" @click=${() => navigator.clipboard?.writeText(this.issuedToken)}>Copy token</button><button class="primary" @click=${() => { this.issuedToken = ''; }}>I saved it</button></div></div></div>`; }
}

customElements.define('gateway-app', GatewayApp);
