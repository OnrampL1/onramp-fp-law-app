import { cn } from "../../../lib/utils";

interface IconProps {
  className?: string;
}

type SvgIconProps = IconProps & {
  children: React.ReactNode;
  size?: string;
  strokeWidth?: number;
};

const iconBase = "fill-none stroke-current";

function SvgIcon({
  children,
  className,
  size = "h-4 w-4",
  strokeWidth = 1.5,
}: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      className={cn(size, iconBase, className)}
    >
      {children}
    </svg>
  );
}

function StrokePath({ d }: { d: string }) {
  return <path strokeLinecap="round" strokeLinejoin="round" d={d} />;
}

function PathIcon({
  className,
  paths,
  size,
  strokeWidth,
}: IconProps & {
  paths: string | readonly string[];
  size?: string;
  strokeWidth?: number;
}) {
  const pathList = Array.isArray(paths) ? paths : [paths];

  return (
    <SvgIcon className={className} size={size} strokeWidth={strokeWidth}>
      {pathList.map((path) => (
        <StrokePath key={path} d={path} />
      ))}
    </SvgIcon>
  );
}

const paths = {
  ban: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  checkCircle:
    "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  chevronLeft: "M15 19l-7-7 7-7",
  chevronRight: "M9 5l7 7-7 7",
  clipboard:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  computer:
    "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3",
  contractName:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  copy:
    "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75",
  counterparty:
    "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  download:
    "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
  fileText:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z",
  link:
    "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  lock:
    "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  plus: "M12 4.5v15m7.5-7.5h-15",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  scale:
    "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971z",
  search:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z",
  send:
    "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  shieldCheck:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  shield:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  sparkles:
    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  upload:
    "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  user:
    "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  userGroup:
    "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  warning:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z",
  xCircle:
    "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  zoomIn:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803zM10.5 7.5v6m-3-3h6",
  zoomOut:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803zM13.5 10.5h-6",
} as const;

const beakerPaths = [
  "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
] as const;

const eyePaths = [
  "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z",
  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
] as const;

export function BanIcon({ className }: IconProps) {
  return <PathIcon paths={paths.ban} className={className} />;
}

export function BeakerIcon({ className }: IconProps) {
  return <PathIcon paths={beakerPaths} className={className} />;
}

export function CalendarIcon({ className }: IconProps) {
  return <PathIcon paths={paths.calendar} className={className} />;
}

export function CheckCircleIcon({ className }: IconProps) {
  return <PathIcon paths={paths.checkCircle} className={className} size="h-5 w-5" />;
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <PathIcon
      paths={paths.chevronLeft}
      className={className}
      strokeWidth={2}
    />
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <PathIcon
      paths={paths.chevronRight}
      className={className}
      strokeWidth={2}
    />
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return <PathIcon paths={paths.clipboard} className={className} size="h-5 w-5" />;
}

export function ClockIcon({ className }: IconProps) {
  return <PathIcon paths={paths.clock} className={className} size="h-5 w-5" />;
}

export function ComputerIcon({ className }: IconProps) {
  return <PathIcon paths={paths.computer} className={className} size="h-5 w-5" />;
}

export function ContractNameIcon({ className }: IconProps) {
  return <PathIcon paths={paths.contractName} className={className} />;
}

export function CopyIcon({ className }: IconProps) {
  return <PathIcon paths={paths.copy} className={className} />;
}

export function CounterpartyIcon({ className }: IconProps) {
  return <PathIcon paths={paths.counterparty} className={className} />;
}

export function DocumentOpenIcon({ className }: IconProps) {
  return <PathIcon paths={paths.contractName} className={className} size="h-5 w-5" />;
}

export function DownloadIcon({ className }: IconProps) {
  return <PathIcon paths={paths.download} className={className} />;
}

export function ExportIcon({ className }: IconProps) {
  return <PathIcon paths={paths.download} className={className} />;
}

export function ExtendIcon({ className }: IconProps) {
  return <PathIcon paths={paths.clock} className={className} />;
}

export function EyeIcon({ className }: IconProps) {
  return <PathIcon paths={eyePaths} className={className} size="h-5 w-5" />;
}

export function FileTextIcon({ className }: IconProps) {
  return <PathIcon paths={paths.fileText} className={className} size="h-5 w-5" />;
}

export function LinkIcon({ className }: IconProps) {
  return <PathIcon paths={paths.link} className={className} size="h-5 w-5" />;
}

export function LockIcon({ className }: IconProps) {
  return <PathIcon paths={paths.lock} className={className} size="h-5 w-5" />;
}

export function LockFooterIcon({ className }: IconProps) {
  return <PathIcon paths={paths.lock} className={className} size="h-3.5 w-3.5" />;
}

export function LogoIcon({ className }: IconProps) {
  return <PathIcon paths={paths.scale} className={className} size="h-6 w-6" />;
}

export function PlusIcon({ className }: IconProps) {
  return <PathIcon paths={paths.plus} className={className} />;
}

export function RefreshIcon({ className }: IconProps) {
  return <PathIcon paths={paths.refresh} className={className} />;
}

export function ScaleIcon({ className }: IconProps) {
  return <PathIcon paths={paths.scale} className={className} />;
}

export function SearchIcon({ className }: IconProps) {
  return <PathIcon paths={paths.search} className={className} />;
}

export function SecurityIcon({ className }: IconProps) {
  return <PathIcon paths={paths.lock} className={className} />;
}

export function SendIcon({ className }: IconProps) {
  return <PathIcon paths={paths.send} className={className} />;
}

export function ShieldCheckIcon({ className }: IconProps) {
  return <PathIcon paths={paths.shieldCheck} className={className} size="h-5 w-5" />;
}

export function ShieldIcon({ className }: IconProps) {
  return <PathIcon paths={paths.shield} className={className} size="h-5 w-5" />;
}

export function SparklesIcon({ className }: IconProps) {
  return <PathIcon paths={paths.sparkles} className={className} />;
}

export function StatusIcon({ className }: IconProps) {
  return <PathIcon paths={paths.checkCircle} className={className} />;
}

export function UploadIcon({ className }: IconProps) {
  return <PathIcon paths={paths.upload} className={className} />;
}

export function UserCheckIcon({ className }: IconProps) {
  return <PathIcon paths={paths.shieldCheck} className={className} size="h-5 w-5" />;
}

export function UserGroupIcon({ className }: IconProps) {
  return <PathIcon paths={paths.userGroup} className={className} size="h-5 w-5" />;
}

export function UserIcon({ className }: IconProps) {
  return <PathIcon paths={paths.user} className={className} />;
}

export function WarningIcon({ className }: IconProps) {
  return <PathIcon paths={paths.warning} className={className} />;
}

export function WarningTriangleIcon({ className }: IconProps) {
  return <PathIcon paths={paths.warning} className={className} />;
}

export function XCircleIcon({ className }: IconProps) {
  return <PathIcon paths={paths.xCircle} className={className} size="h-5 w-5" />;
}

export function ZoomInIcon({ className }: IconProps) {
  return <PathIcon paths={paths.zoomIn} className={className} />;
}

export function ZoomOutIcon({ className }: IconProps) {
  return <PathIcon paths={paths.zoomOut} className={className} />;
}
