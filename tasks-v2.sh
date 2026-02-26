#!/usr/bin/env bash
# tasks.sh — World-class project task tracker
# Drop into any project root. NEVER deletes — only archives.
#
#   ./tasks.sh open                       Open board in browser
#   ./tasks.sh add "Title" [Category]     Add task
#   ./tasks.sh priority ID P1|P2|P3       Set priority
#   ./tasks.sh start ID                   Mark in progress
#   ./tasks.sh done ID                    Mark done
#   ./tasks.sh archive ID                 Archive (never deletes)
#   ./tasks.sh note ID "text"             Add note to a task
#   ./tasks.sh column add "Label"         Add custom column
#   ./tasks.sh column list                List all columns
#   ./tasks.sh stdlib                     Import standard dev task set
#   ./tasks.sh sync                       Push to live URL
#   ./tasks.sh list                       Terminal view

set -euo pipefail

TASKS_DIR=".tasks"
TASKS_FILE="$TASKS_DIR/tasks.dat"
NOTES_FILE="$TASKS_DIR/notes.dat"
PRIORITIES_FILE="$TASKS_DIR/priorities.dat"
COLUMNS_FILE="$TASKS_DIR/columns.dat"
BOARD_FILE="TASKS.md"
HTML_FILE="tasks.html"
PROJECT_NAME="${PWD##*/}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
DIM='\033[2m'; BOLD='\033[1m'; RED='\033[0;31m'; NC='\033[0m'

init() {
  mkdir -p "$TASKS_DIR"
  for f in "$TASKS_FILE" "$NOTES_FILE" "$PRIORITIES_FILE" "$COLUMNS_FILE"; do
    [[ -f "$f" ]] || touch "$f"
  done
}

next_id() {
  if [[ ! -s "$TASKS_FILE" ]]; then echo "001"; return; fi
  local last; last=$(awk -F'|' '{print $1}' "$TASKS_FILE" | sort -n | tail -1)
  printf "%03d" $((10#${last} + 1))
}

get_priority() {
  local id="$1"
  [[ -s "$PRIORITIES_FILE" ]] && grep "^${id}|" "$PRIORITIES_FILE" | awk -F'|' '{print $2}' | tail -1 || echo ""
}

get_notes_for_id() {
  local id="$1"
  [[ -s "$NOTES_FILE" ]] && grep "^${id}|" "$NOTES_FILE" || true
}

get_notes_md()   { get_notes_for_id "$1" | awk -F'|' '{print "  - `[" $2 "]` " $3}'; }
get_notes_term() {
  get_notes_for_id "$1" | awk -F'|' -v d='\033[2m' -v n='\033[0m' \
    '{printf "       %s[%s] %s%s\n", d, $2, $3, n}'
}

# ── Column helpers ─────────────────────────────────────────────────────────────

_col_defs() {
  echo "TODO|To Do"
  echo "IN_PROGRESS|In Progress"
  echo "DONE|Done"
  echo "ARCHIVED|Archived"
  [[ -s "$COLUMNS_FILE" ]] && cat "$COLUMNS_FILE"
}

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_add() {
  local id; id=$(next_id)
  printf "%s|TODO|%s|%s||%s\n" "$id" "${2:-General}" "$(date +%Y-%m-%d)" "$1" >> "$TASKS_FILE"
  echo -e "${GREEN}Added [${id}]${NC} $1"; _refresh
}

cmd_priority() {
  grep -q "^${1}|" "$TASKS_FILE" 2>/dev/null || { echo -e "${RED}Not found${NC}"; exit 1; }
  local tmp; tmp=$(mktemp)
  grep -v "^${1}|" "$PRIORITIES_FILE" > "$tmp" 2>/dev/null || true
  [[ -n "$2" && "$2" != "none" ]] && printf "%s|%s\n" "$1" "$2" >> "$tmp"
  mv "$tmp" "$PRIORITIES_FILE"
  echo -e "${GREEN}Task $1 priority → $2${NC}"; _refresh
}

cmd_set_status() {
  grep -q "^${1}|" "$TASKS_FILE" 2>/dev/null || { echo -e "${RED}Not found${NC}"; exit 1; }
  local tmp; tmp=$(mktemp)
  awk -F'|' -v id="$1" -v s="$2" -v d="$(date +%Y-%m-%d)" 'BEGIN{OFS="|"} {
    if ($1==id) { $2=s; if (s=="DONE"||s=="ARCHIVED") $5=d }; print
  }' "$TASKS_FILE" > "$tmp"; mv "$tmp" "$TASKS_FILE"
  echo -e "${GREEN}Task $1 → $2${NC}"; _refresh
}

cmd_note() {
  grep -q "^${1}|" "$TASKS_FILE" 2>/dev/null || { echo -e "${RED}Not found${NC}"; exit 1; }
  printf "%s|%s|%s\n" "$1" "$(date +%Y-%m-%d)" "$2" >> "$NOTES_FILE"
  echo -e "${GREEN}Note added to $1${NC}"; _refresh
}

cmd_column() {
  case "${1:-list}" in
    add)
      local label="${2:?Need a column label, e.g.: ./tasks.sh column add \"In Review\"}"
      local key; key=$(printf '%s' "$label" | tr '[:lower:]' '[:upper:]' | tr ' ' '_' | tr -cd '[:alnum:]_')
      case "$key" in TODO|IN_PROGRESS|DONE|ARCHIVED)
        echo -e "${RED}$key is a default column${NC}"; exit 1 ;; esac
      grep -q "^${key}|" "$COLUMNS_FILE" 2>/dev/null && { echo -e "${RED}Column $key already exists${NC}"; exit 1; }
      printf "%s|%s\n" "$key" "$label" >> "$COLUMNS_FILE"
      echo -e "${GREEN}Column added:${NC} $key → $label"; _refresh
      ;;
    list)
      echo -e "${BOLD}Columns:${NC}"
      echo -e "  ${CYAN}TODO${NC}         → To Do (default)"
      echo -e "  ${CYAN}IN_PROGRESS${NC}  → In Progress (default)"
      echo -e "  ${CYAN}DONE${NC}         → Done (default)"
      echo -e "  ${CYAN}ARCHIVED${NC}     → Archived (default)"
      if [[ -s "$COLUMNS_FILE" ]]; then
        while IFS='|' read -r k l; do
          [[ -z "$k" ]] && continue
          echo -e "  ${CYAN}${k}${NC}  → $l (custom)"
        done < "$COLUMNS_FILE"
      else
        echo -e "  ${DIM}No custom columns yet${NC}"
      fi
      ;;
    *) echo "Usage: ./tasks.sh column add \"Label\" | ./tasks.sh column list" ;;
  esac
}

cmd_stdlib() {
  echo -e "${CYAN}Adding standard project dev tasks…${NC}"
  local today; today=$(date +%Y-%m-%d)
  local tasks=(
    "Auth|Configure passkey (WebAuthn) registration endpoint"
    "Auth|Configure passkey login flow"
    "Auth|Add session token storage in KV"
    "Auth|Add logout endpoint"
    "Auth|Test auth registration and login end-to-end"
    "DNS|Add A record for apex domain"
    "DNS|Add CNAME for www subdomain"
    "DNS|Add CNAME for app subdomain"
    "DNS|Verify domain resolves in Cloudflare"
    "Secrets|Set JWT_SECRET"
    "Secrets|Set STRIPE_SECRET_KEY"
    "Secrets|Set STRIPE_PUBLISHABLE_KEY"
    "Secrets|Set STRIPE_WEBHOOK_SECRET"
    "Secrets|Set EMAILIT_API_KEY"
    "Billing|Create Stripe products and price IDs"
    "Billing|Build checkout session endpoint"
    "Billing|Set up Stripe webhook receiver"
    "Billing|Handle subscription.created event"
    "Billing|Handle subscription.cancelled event"
    "Billing|Handle invoice.payment_failed event"
    "Email|Configure EmailIt API key"
    "Email|Build welcome email template"
    "Email|Build billing receipt email"
    "Email|Build payment failed alert email"
    "Database|Design initial schema"
    "Database|Write create-table migrations"
    "Database|Add indexes for common queries"
    "Database|Write seed/fixture data"
    "CI/CD|Create GitHub Actions workflow"
    "CI/CD|Add TypeScript typecheck step"
    "CI/CD|Add deploy-to-Cloudflare step"
    "CI/CD|Add preview deployments for PRs"
    "Security|Add rate limiting to all API endpoints"
    "Security|Add CORS configuration"
    "Security|Add security headers middleware"
    "Security|Audit all endpoints for auth checks"
    "Monitoring|Add /health endpoint"
    "Monitoring|Set up Cloudflare Analytics"
    "Monitoring|Add structured error logging"
    "Testing|Write unit tests for core business logic"
    "Testing|Write integration tests for API endpoints"
    "Testing|Set up E2E testing with Playwright"
    "AI|Add Claude API key secret"
    "AI|Build AI assistant endpoint"
    "AI|Wire assistant to user context"
    "Landing|Write hero headline and subheading"
    "Landing|Add pricing section with 3 tiers"
    "Landing|Add feature grid"
    "Landing|Add FAQ section"
    "Landing|Add footer with legal links"
    "Dashboard|Build main authenticated dashboard"
    "Dashboard|Add usage stats section"
    "Dashboard|Add billing management section"
    "SEO|Add meta tags and OG image"
    "SEO|Create sitemap.xml"
    "SEO|Create robots.txt"
    "Launch|Write Product Hunt post"
    "Launch|Post in Indie Hackers"
    "Launch|Announce on X/Twitter"
  )
  local count=0
  for task in "${tasks[@]}"; do
    local cat title
    cat="${task%%|*}"; title="${task##*|}"
    local id; id=$(next_id)
    printf "%s|TODO|%s|%s||%s\n" "$id" "$cat" "$today" "$title" >> "$TASKS_FILE"
    echo -e "${DIM}  + [${id}] ${title}${NC}"
    (( count++ ))
  done
  echo -e "${GREEN}Added ${count} standard tasks.${NC}"; _refresh
}

_refresh() { cmd_board > /dev/null; cmd_html; sync_kv; }

# ── KV Sync ───────────────────────────────────────────────────────────────────

sync_kv() {
  [[ -f "$TASKS_DIR/config" ]] || return 0
  # shellcheck source=/dev/null
  source "$TASKS_DIR/config"
  [[ -n "${KV_NAMESPACE_ID:-}" ]] || return 0
  local a=("--namespace-id" "$KV_NAMESPACE_ID")
  [[ -n "${WRANGLER_CONFIG:-}" ]] && a+=("--config" "$WRANGLER_CONFIG")
  npx wrangler kv key put "TASKS_HTML" --path "$HTML_FILE" "${a[@]}" 2>/dev/null \
    && echo -e "${DIM}→ Synced to KV (live URL updated)${NC}" \
    || echo -e "${DIM}→ KV sync skipped${NC}"
  npx wrangler kv key put "TASKS_DATA" "$(cat "$TASKS_FILE")" "${a[@]}" 2>/dev/null || true
}

# ── Card renderer ─────────────────────────────────────────────────────────────

_card() {
  local id="$1" s="$2" cat="$3" added="$4" done_date="$5" title="$6"
  local p; p=$(get_priority "$id")
  local sc; case "$s" in TODO) sc="todo";; IN_PROGRESS) sc="inp";; DONE) sc="done";; ARCHIVED) sc="arch";; *) sc="todo";; esac
  local safe_title
  safe_title=$(printf '%s' "$title" | sed 's/"/\&quot;/g; s/</\&lt;/g; s/>/\&gt;/g')
  local is_closed=false
  [[ "$s" == "DONE" || "$s" == "ARCHIVED" ]] && is_closed=true

  echo "<div class=\"card $sc\" data-id=\"$id\" data-cat=\"$cat\" data-title=\"$safe_title\"${p:+ data-p=\"$p\"}>"
  echo "  <div class=\"card-top\">"
  echo "    <span class=\"card-cat\">$cat</span>"
  echo "    <span class=\"card-id\" onclick=\"copyId('$id')\">#$id</span>"
  echo "  </div>"
  echo "  <div class=\"card-body\">"
  if [[ "$is_closed" == "true" ]]; then
    echo "    <div class=\"card-title\"><s>$title</s></div>"
  else
    echo "    <div class=\"card-title\">$title</div>"
  fi
  local notes; notes=$(get_notes_for_id "$id")
  if [[ -n "$notes" ]]; then
    echo "    <ul class=\"card-notes\">"
    echo "$notes" | awk -F'|' '{print "      <li><span class=\"nd\">" $2 "</span>" $3 "</li>"}'
    echo "    </ul>"
  fi
  echo "  </div>"
  echo "  <div class=\"card-foot\">"
  echo "    <span class=\"card-date\">${done_date:-$added}</span>"
  if [[ -n "$p" ]]; then
    local dot_cls; case "$p" in P1) dot_cls="p1";; P2) dot_cls="p2";; *) dot_cls="p3";; esac
    echo "    <span class=\"prio-dot $dot_cls\" title=\"$p\"></span>"
  fi
  echo "  </div>"
  echo "</div>"
}

# ── HTML board ────────────────────────────────────────────────────────────────

cmd_html() {
  local today; today=$(date +%Y-%m-%d)
  local today_fmt; today_fmt=$(date '+%d %b %Y' 2>/dev/null || echo "$today")

  # Build column definitions
  local col_defs=()
  while IFS= read -r def; do
    [[ -z "$def" ]] && continue
    col_defs+=("$def")
  done < <(_col_defs)

  # Stats
  local tc=0 ic=0 dc=0 ac=0 total=0
  if [[ -s "$TASKS_FILE" ]]; then
    tc=$(awk -F'|' '$2=="TODO"{c++}END{print c+0}' "$TASKS_FILE")
    ic=$(awk -F'|' '$2=="IN_PROGRESS"{c++}END{print c+0}' "$TASKS_FILE")
    dc=$(awk -F'|' '$2=="DONE"{c++}END{print c+0}' "$TASKS_FILE")
    ac=$(awk -F'|' '$2=="ARCHIVED"{c++}END{print c+0}' "$TASKS_FILE")
    total=$(awk 'END{print NR}' "$TASKS_FILE")
  fi
  local pct=0; [[ $total -gt 0 ]] && pct=$(( (dc * 100) / total ))

  # SVG ring (r=26, circumference≈163)
  local ring_c=163
  local ring_offset=$(( ring_c - (ring_c * pct / 100) ))

  local cats=""
  [[ -s "$TASKS_FILE" ]] && cats=$(awk -F'|' '{print $3}' "$TASKS_FILE" | sort -u)

  {
  cat <<HTMLHEAD
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${PROJECT_NAME}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap');

/* ── Design Tokens ──────────────────────────────────────── */
:root {
  --font-ui:       'DM Sans', system-ui, sans-serif;
  --font-serif:    'Playfair Display', 'Georgia', serif;

  /* Dark palette (default) */
  --bg:            #0F0F10;
  --surface:       #181819;
  --surface2:      #1E1E20;
  --surface3:      #252527;
  --border:        rgba(255,255,255,.055);
  --border2:       rgba(255,255,255,.10);
  --text:          #F4F3F0;
  --text2:         #9A9993;
  --text3:         #575653;
  --text4:         #353430;
  --accent:        #C4A882;
  --accent-dim:    rgba(196,168,130,.10);
  --accent-glow:   rgba(196,168,130,.22);
  --p2-color:      #7A70B0;
  --done-color:    #5A9B7A;
  --done-bg:       rgba(90,155,122,.08);
  --r:             10px;
  --r-lg:          16px;
  --sh:            0 1px 0 rgba(255,255,255,.025), 0 2px 14px rgba(0,0,0,.45);
  --sh2:           0 0 0 1px rgba(255,255,255,.06), 0 8px 36px rgba(0,0,0,.65);
  --sh-focus:      0 0 0 2px var(--accent-dim), 0 8px 36px rgba(0,0,0,.65);
  --sb-w:          244px;

  /* Sidebar tokens */
  --sb-bg:         #0B0B0D;
  --sb-border:     rgba(255,255,255,.045);
  --sb-text:       #CCCCC6;
  --sb-text2:      #575653;
  --sb-text3:      #313130;
  --sb-hover:      rgba(255,255,255,.04);
  --sb-active-bg:  rgba(196,168,130,.08);
  --sb-active:     #C4A882;
  --sb-badge-bg:   rgba(255,255,255,.06);
  --sb-badge:      #575653;
  --sb-ring-track: rgba(255,255,255,.06);
  --sb-stat-bg:    rgba(255,255,255,.03);
  --sb-stat-n:     #D8D8D2;
  --sb-stat-l:     #353430;
  --sb-input-bg:   rgba(255,255,255,.04);
  --sb-input-text: #CCCCC6;
  --sb-input-ph:   #353430;
  --sb-icon:       #353430;
  --sb-btn-bg:     rgba(255,255,255,.04);
  --sb-btn-text:   #575653;
  --sb-hint:       #252527;
}

[data-theme=light] {
  --bg:            #F0EEE9;
  --surface:       #FAFAF8;
  --surface2:      #F2F0EB;
  --surface3:      #E8E5DE;
  --border:        rgba(0,0,0,.07);
  --border2:       rgba(0,0,0,.12);
  --text:          #141210;
  --text2:         #5A5856;
  --text3:         #9A9890;
  --text4:         #C2C0B8;
  --accent:        #8B6844;
  --accent-dim:    rgba(139,104,68,.09);
  --accent-glow:   rgba(139,104,68,.20);
  --p2-color:      #5E54A0;
  --done-color:    #2E7A52;
  --done-bg:       rgba(46,122,82,.08);
  --sh:            0 1px 0 rgba(0,0,0,.04), 0 2px 14px rgba(0,0,0,.07);
  --sh2:           0 0 0 1px rgba(0,0,0,.08), 0 8px 36px rgba(0,0,0,.13);
  --sh-focus:      0 0 0 2px var(--accent-dim), 0 8px 36px rgba(0,0,0,.12);
  --sb-bg:         #E8E5DE;
  --sb-border:     rgba(0,0,0,.08);
  --sb-text:       #1C1A18;
  --sb-text2:      #6A6864;
  --sb-text3:      #9A9890;
  --sb-hover:      rgba(0,0,0,.05);
  --sb-active-bg:  rgba(139,104,68,.09);
  --sb-active:     #7A5C36;
  --sb-badge-bg:   rgba(0,0,0,.07);
  --sb-badge:      #6A6864;
  --sb-ring-track: rgba(0,0,0,.08);
  --sb-stat-bg:    rgba(0,0,0,.04);
  --sb-stat-n:     #1C1A18;
  --sb-stat-l:     #9A9890;
  --sb-input-bg:   rgba(0,0,0,.05);
  --sb-input-text: #1C1A18;
  --sb-input-ph:   #9A9890;
  --sb-icon:       #9A9890;
  --sb-btn-bg:     rgba(0,0,0,.05);
  --sb-btn-text:   #6A6864;
  --sb-hint:       #9A9890;
}

/* ── Reset ──────────────────────────────────────────────── */
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: flex;
  height: 100vh;
  overflow: hidden;
  transition: background 300ms ease, color 300ms ease;
}

/* ── Sidebar ─────────────────────────────────────────────── */
.sidebar {
  width: var(--sb-w);
  flex-shrink: 0;
  background: var(--sb-bg);
  border-right: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  transition: background 300ms ease;
}
.sidebar::-webkit-scrollbar { width: 0; }

/* Brand */
.sb-brand {
  padding: 28px 22px 22px;
  border-bottom: 1px solid var(--sb-border);
}
.sb-eyebrow {
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
  display: block;
}
.sb-name {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 400;
  font-style: italic;
  color: var(--sb-text);
  letter-spacing: -.3px;
  line-height: 1.1;
}
.sb-date {
  font-size: 10px;
  color: var(--sb-text3);
  margin-top: 8px;
  letter-spacing: .8px;
  text-transform: uppercase;
  font-weight: 400;
}

/* Section */
.sb-section { padding: 20px 16px 12px; border-bottom: 1px solid var(--sb-border); }
.sb-label {
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--sb-text3);
  padding: 0 6px;
  margin-bottom: 8px;
  display: block;
}

/* Nav */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: var(--r);
  background: transparent;
  color: var(--sb-text2);
  font-size: 12.5px;
  font-weight: 400;
  letter-spacing: .1px;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: color 150ms ease, background 150ms ease;
  text-align: left;
  position: relative;
  margin-bottom: 2px;
}
.nav-item::before {
  content: '';
  position: absolute;
  left: 0; top: 50%; transform: translateY(-50%);
  width: 2px; height: 0;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
  transition: height 220ms cubic-bezier(.25,.46,.45,.94);
}
.nav-item:hover { background: var(--sb-hover); color: var(--sb-text); }
.nav-item.active { color: var(--sb-active); background: var(--sb-active-bg); font-weight: 500; }
.nav-item.active::before { height: 18px; }
.nav-icon { font-size: 13px; width: 16px; text-align: center; flex-shrink: 0; opacity: .7; }
.nav-count {
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 600;
  background: var(--sb-badge-bg);
  color: var(--sb-badge);
  border-radius: 999px;
  padding: 2px 7px;
  letter-spacing: .3px;
  transition: all 150ms ease;
}
.nav-item.active .nav-count {
  background: var(--sb-active-bg);
  color: var(--sb-active);
}

/* Progress ring */
.sb-ring-section { padding: 20px 20px 16px; border-bottom: 1px solid var(--sb-border); }
.sb-ring-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.sb-ring-wrap { position: relative; width: 58px; height: 58px; flex-shrink: 0; }
.sb-ring { width: 58px; height: 58px; }
.sb-ring-track { fill: none; stroke: var(--sb-ring-track); stroke-width: 2; }
.sb-ring-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 800ms cubic-bezier(.4,0,.2,1);
}
.sb-ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.sb-ring-pct {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 500;
  color: var(--sb-text);
  line-height: 1;
}
.sb-ring-sub {
  font-size: 7.5px;
  letter-spacing: 1px;
  color: var(--sb-text3);
  text-transform: uppercase;
  margin-top: 2px;
}
.sb-ring-info { flex: 1; }
.sb-ring-info-label {
  font-size: 8.5px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--sb-text3);
  margin-bottom: 6px;
}
.sb-ring-info-val {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  color: var(--sb-stat-n);
  line-height: 1;
}
.sb-ring-info-sub {
  font-size: 10px;
  color: var(--sb-text3);
  margin-top: 3px;
}
.sb-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.sb-metric {
  background: var(--sb-stat-bg);
  border-radius: 8px;
  padding: 10px 8px;
  border: 1px solid var(--sb-border);
  text-align: center;
}
.sb-metric-n {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 400;
  color: var(--sb-stat-n);
  line-height: 1;
}
.sb-metric-l {
  font-size: 7.5px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sb-stat-l);
  margin-top: 4px;
}

/* Search */
.sb-search-wrap { position: relative; }
.sb-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--sb-icon); font-size: 12px; pointer-events: none;
}
#search {
  width: 100%;
  background: var(--sb-input-bg);
  border: 1px solid var(--sb-border);
  border-radius: 8px;
  padding: 8px 10px 8px 30px;
  font-size: 12px;
  font-family: var(--font-ui);
  color: var(--sb-input-text);
  outline: none;
  transition: border-color 200ms ease;
  letter-spacing: .1px;
}
#search:focus { border-color: var(--accent); }
#search::placeholder { color: var(--sb-input-ph); }

/* Sidebar filter list */
.sb-filter-list { display: flex; flex-direction: column; gap: 1px; }
.sb-filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--sb-text2);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: color 150ms ease, background 150ms ease;
  text-align: left;
  width: 100%;
}
.sb-filter-item:hover { background: var(--sb-hover); color: var(--sb-text); }
.sb-filter-item.on { color: var(--sb-active); background: var(--sb-active-bg); font-weight: 500; }
.sb-filter-count {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--sb-badge);
  background: var(--sb-badge-bg);
  border-radius: 999px;
  padding: 1px 6px;
}

/* Priority filters */
.prio-filter-list { display: flex; flex-direction: column; gap: 1px; }
.prio-filter-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--sb-text2);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: color 150ms ease, background 150ms ease;
  text-align: left;
  width: 100%;
}
.prio-filter-item:hover { background: var(--sb-hover); color: var(--sb-text); }
.prio-filter-item.on { color: var(--sb-active); background: var(--sb-active-bg); }
.pf-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pf-dot.p1 { background: var(--accent); }
.pf-dot.p2 { background: var(--p2-color); }
.pf-dot.p3 { background: var(--sb-text3); }

/* Sidebar controls */
.sb-controls { padding: 14px 16px; border-bottom: 1px solid var(--sb-border); display: flex; gap: 6px; }
.sb-ctrl {
  flex: 1;
  background: var(--sb-btn-bg);
  border: 1px solid var(--sb-border);
  color: var(--sb-btn-text);
  border-radius: 8px;
  padding: 7px 6px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .4px;
  text-transform: uppercase;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: all 150ms ease;
  text-align: center;
}
.sb-ctrl:hover { color: var(--sb-text); border-color: var(--sb-text3); }
.sb-ctrl.on { background: var(--sb-active-bg); border-color: transparent; color: var(--sb-active); }

/* Footer */
.sb-footer {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--sb-border);
}
.sb-shortcuts {
  font-size: 9px;
  color: var(--sb-hint);
  line-height: 1.9;
  letter-spacing: .3px;
}
.sb-shortcuts strong {
  color: var(--sb-text3);
  font-weight: 600;
}

/* ── Main ────────────────────────────────────────────────── */
.main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; }

/* View toggle */
.view { display: none; flex: 1; flex-direction: column; }
.view.active { display: flex; }

/* Board view header */
.board-head {
  padding: 28px 32px 0;
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-shrink: 0;
}
.board-hl {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 400;
  font-style: italic;
  color: var(--text3);
  letter-spacing: -.2px;
}
.board-divider {
  flex: 1;
  height: 1px;
  background: var(--border);
  align-self: center;
}
.board-date {
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 400;
}

/* Board grid */
.board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 24px;
  padding: 24px 32px 120px;
  align-items: start;
}

/* Column */
.col { display: flex; flex-direction: column; }
.col-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 2px 14px;
  margin-bottom: 2px;
}
.col-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text3);
}
.col-inp .col-label { color: var(--accent); }
.col-done .col-label { color: var(--done-color); }
.col-n {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  font-style: italic;
  color: var(--text4);
  line-height: 1;
  letter-spacing: -.5px;
}
.col-inp .col-n { color: var(--accent); opacity: .5; }
.col-done .col-n { color: var(--done-color); opacity: .6; }
.col-cards { display: flex; flex-direction: column; gap: 0; }

/* Category groups */
.cat-group { margin-bottom: 2px; }
.cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--text3);
  user-select: none;
  transition: background 150ms ease, color 150ms ease;
  margin-bottom: 4px;
}
.cat-header:hover { background: var(--surface2); color: var(--text2); }
.cat-arrow {
  display: inline-block;
  font-size: 10px;
  font-style: normal;
  color: var(--text4);
  flex-shrink: 0;
  transition: transform 220ms cubic-bezier(.25,.46,.45,.94);
  transform: rotate(90deg);
  font-family: serif;
  line-height: 1;
}
.cat-header.collapsed .cat-arrow { transform: rotate(0deg); }
.cat-name { flex: 1; }
.cat-n {
  font-size: 9px;
  font-weight: 600;
  color: var(--text4);
  background: var(--surface2);
  border-radius: 999px;
  padding: 1px 7px;
  letter-spacing: .3px;
  border: 1px solid var(--border);
}
.cat-cards { display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px; }
.cat-cards.collapsed { display: none; }

/* ── Card ────────────────────────────────────────────────── */
.card {
  background: var(--surface);
  border-radius: var(--r);
  padding: 16px 18px;
  box-shadow: var(--sh);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
  transition:
    transform 220ms cubic-bezier(.25,.46,.45,.94),
    box-shadow 220ms cubic-bezier(.25,.46,.45,.94),
    opacity 220ms ease;
  cursor: default;
}
/* Subtle top sheen */
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.05) 40%, rgba(255,255,255,.05) 60%, transparent);
  pointer-events: none;
}
.card:hover { transform: translateY(-3px); box-shadow: var(--sh2); }
.card.done  { opacity: .44; }
.card.arch  { opacity: .22; }
.card.hidden { display: none; }

/* P1 — gold left accent line */
.card[data-p="P1"] {
  border-left-width: 2px;
  border-left-color: var(--accent);
}
/* P2 — violet left accent line */
.card[data-p="P2"] {
  border-left-width: 2px;
  border-left-color: var(--p2-color);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
}
.card-cat {
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--text3);
}
.card-id {
  font-size: 9px;
  font-weight: 500;
  color: var(--text4);
  cursor: pointer;
  letter-spacing: .6px;
  font-variant-numeric: tabular-nums;
  transition: color 150ms ease;
}
.card-id:hover { color: var(--accent); }

.card-body { margin-bottom: 14px; }
.card-title {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text);
  letter-spacing: .1px;
}
.card.done .card-title,
.card.arch .card-title {
  color: var(--text3);
  text-decoration-color: var(--text4);
}

.card-notes {
  list-style: none;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.card-notes li { font-size: 11px; color: var(--text2); line-height: 1.5; }
.nd {
  font-size: 8.5px;
  font-weight: 600;
  color: var(--text4);
  letter-spacing: .5px;
  margin-right: 5px;
  text-transform: uppercase;
}

.card-foot {
  display: flex;
  align-items: center;
  padding-top: 11px;
  border-top: 1px solid var(--border);
}
.card-date {
  font-size: 10px;
  color: var(--text4);
  font-variant-numeric: tabular-nums;
  letter-spacing: .3px;
}
.prio-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-left: auto;
  flex-shrink: 0;
  transition: box-shadow 200ms ease;
}
.card:hover .prio-dot { box-shadow: 0 0 0 3px var(--accent-dim); }
.prio-dot.p1 { background: var(--accent); }
.prio-dot.p2 { background: var(--p2-color); }
.prio-dot.p3 { background: var(--text4); }

.empty {
  padding: 36px 16px;
  border: 1px dashed var(--border);
  border-radius: var(--r);
  color: var(--text4);
  font-size: 11px;
  text-align: center;
  letter-spacing: .5px;
}

/* ── Notes view ──────────────────────────────────────────── */
.notes-container {
  max-width: 740px;
  width: 100%;
  margin: 0 auto;
  padding: 40px 36px 48px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.notes-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-shrink: 0;
}
.notes-headline {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 400;
  font-style: italic;
  color: var(--text);
  letter-spacing: -.5px;
  line-height: 1.1;
}
.notes-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
}
.notes-status {
  font-size: 10px;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: var(--text4);
  transition: color 300ms ease;
}
.notes-status.saved { color: var(--done-color); }
.notes-act {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text3);
  border-radius: 8px;
  padding: 6px 13px;
  font-size: 11px;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  letter-spacing: .3px;
  transition: all 150ms ease;
}
.notes-act:hover { border-color: var(--accent); color: var(--accent); }
#notes-area {
  flex: 1;
  width: 100%;
  min-height: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 28px 30px;
  font-family: var(--font-ui);
  font-size: 14.5px;
  font-weight: 300;
  line-height: 1.85;
  color: var(--text);
  resize: none;
  outline: none;
  box-shadow: var(--sh);
  transition: border-color 200ms ease, box-shadow 200ms ease;
  letter-spacing: .1px;
}
#notes-area:focus {
  border-color: rgba(196,168,130,.25);
  box-shadow: var(--sh-focus);
}
#notes-area::placeholder { color: var(--text4); font-weight: 300; }

/* ── AI Console ──────────────────────────────────────────── */
#chat-fab {
  position: fixed;
  bottom: 26px; right: 26px;
  width: 46px; height: 46px;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px var(--accent-dim), var(--sh);
  z-index: 300;
  font-size: 17px;
  color: var(--accent);
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}
#chat-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 0 0 1px var(--accent-glow), 0 8px 28px rgba(0,0,0,.6);
  border-color: var(--accent);
}
#chat-panel {
  position: fixed;
  bottom: 84px; right: 26px;
  width: 390px;
  max-height: 560px;
  background: rgba(14,14,16,.97);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: var(--r-lg);
  border: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 0 0 1px var(--accent-dim), 0 24px 64px rgba(0,0,0,.75);
  z-index: 300;
  display: none;
  flex-direction: column;
  overflow: hidden;
}
[data-theme=light] #chat-panel {
  background: rgba(30,28,26,.97);
}
#chat-panel.open { display: flex; animation: panelIn 200ms cubic-bezier(.25,.46,.45,.94); }
@keyframes panelIn {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.chat-head {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.chat-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: rgba(255,255,255,.5);
}
.ai-pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--done-color);
  box-shadow: 0 0 6px var(--done-color);
  animation: pulse 2.5s ease infinite;
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 4px var(--done-color); opacity: 1; }
  50%      { box-shadow: 0 0 12px var(--done-color); opacity: .8; }
}
.ch-acts { display: flex; gap: 4px; }
.cibtn {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,.25);
  cursor: pointer;
  font-size: 12px;
  width: 26px; height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}
.cibtn:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.6); }
.chat-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}
.chat-msgs::-webkit-scrollbar { width: 0; }
.msg {
  max-width: 90%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.6;
  font-weight: 300;
  animation: msgIn 200ms ease;
  letter-spacing: .1px;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.msg.user {
  background: rgba(196,168,130,.12);
  border: 1px solid rgba(196,168,130,.15);
  color: rgba(255,255,255,.8);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.msg.ai {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.07);
  color: rgba(255,255,255,.65);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.msg.thinking { color: rgba(255,255,255,.3); font-style: italic; }
.chat-settings {
  display: none;
  padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.03);
}
.chat-settings.open { display: block; }
.slabel {
  font-size: 8.5px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,255,255,.25);
  margin-bottom: 8px;
  display: block;
}
.sinput {
  width: 100%;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 11.5px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: rgba(255,255,255,.7);
  outline: none;
  transition: border-color 200ms ease;
}
.sinput:focus { border-color: rgba(196,168,130,.35); }
.sinput::placeholder { color: rgba(255,255,255,.15); }
.ssave {
  margin-top: 8px;
  width: 100%;
  background: rgba(196,168,130,.12);
  border: 1px solid rgba(196,168,130,.2);
  border-radius: 8px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
  font-family: var(--font-ui);
  letter-spacing: .5px;
  padding: 7px;
  cursor: pointer;
  transition: all 150ms ease;
}
.ssave:hover { background: rgba(196,168,130,.18); }
.shint { font-size: 9.5px; color: rgba(255,255,255,.2); margin-top: 7px; }
.chat-inp-row {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.06);
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
#chat-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,.1);
  border-radius: 0;
  padding: 6px 4px;
  font-size: 12.5px;
  font-family: var(--font-ui);
  color: rgba(255,255,255,.75);
  outline: none;
  resize: none;
  max-height: 100px;
  overflow-y: auto;
  transition: border-color 200ms ease;
  font-weight: 300;
  letter-spacing: .1px;
}
#chat-input:focus { border-bottom-color: var(--accent); }
#chat-input::placeholder { color: rgba(255,255,255,.18); }
#chat-send {
  background: rgba(196,168,130,.1);
  border: 1px solid rgba(196,168,130,.18);
  border-radius: 8px;
  width: 34px; height: 34px;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms ease;
}
#chat-send:hover { background: rgba(196,168,130,.18); }
#chat-send:disabled { opacity: .3; cursor: not-allowed; }

/* ── Toast ───────────────────────────────────────────────── */
#toast {
  position: fixed;
  bottom: 26px; left: 50%;
  transform: translateX(-50%) translateY(72px);
  background: var(--surface3);
  color: var(--text2);
  border: 1px solid var(--border2);
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 400;
  letter-spacing: .3px;
  z-index: 400;
  transition: transform 280ms cubic-bezier(.25,.46,.45,.94);
  pointer-events: none;
  box-shadow: var(--sh);
}
#toast.show { transform: translateX(-50%) translateY(0); }

/* Focus mode */
body.focus-mode .card { opacity: .1; pointer-events: none; }
body.focus-mode .card[data-p="P1"] { opacity: 1; pointer-events: auto; }

/* Scrollbar (webkit) */
.main::-webkit-scrollbar { width: 4px; }
.main::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
.main::-webkit-scrollbar-track { background: transparent; }

@media (max-width: 900px) {
  .board { grid-template-columns: repeat(2, 1fr); padding: 20px 20px 100px; }
}
@media (max-width: 580px) {
  .sidebar { display: none; }
  .board { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
HTMLHEAD

  # ── Sidebar ──────────────────────────────────────────────────────────────────
  echo "<div class=\"sidebar\">"

  # Brand
  echo "  <div class=\"sb-brand\">"
  echo "    <span class=\"sb-eyebrow\">Workspace</span>"
  echo "    <div class=\"sb-name\">${PROJECT_NAME}</div>"
  echo "    <div class=\"sb-date\">${today_fmt}</div>"
  echo "  </div>"

  # Navigation
  echo "  <div class=\"sb-section\">"
  echo "    <span class=\"sb-label\">Views</span>"
  echo "    <button class=\"nav-item active\" id=\"nav-board\" onclick=\"showView('board')\">"
  echo "      <span class=\"nav-icon\">&#9638;</span><span>Board</span>"
  echo "      <span class=\"nav-count\">${total}</span>"
  echo "    </button>"
  echo "    <button class=\"nav-item\" id=\"nav-notes\" onclick=\"showView('notes')\">"
  echo "      <span class=\"nav-icon\">&#9998;</span><span>Notes</span>"
  echo "    </button>"
  echo "  </div>"

  # Ring + metrics
  echo "  <div class=\"sb-ring-section\">"
  echo "    <div class=\"sb-ring-row\">"
  echo "      <div class=\"sb-ring-wrap\">"
  echo "        <svg class=\"sb-ring\" viewBox=\"0 0 58 58\">"
  echo "          <circle class=\"sb-ring-track\" cx=\"29\" cy=\"29\" r=\"24\"/>"
  echo "          <circle class=\"sb-ring-fill\" cx=\"29\" cy=\"29\" r=\"24\""
  echo "            stroke-dasharray=\"151\" stroke-dashoffset=\"${ring_offset}\"/>"
  echo "        </svg>"
  echo "        <div class=\"sb-ring-label\">"
  echo "          <span class=\"sb-ring-pct\">${pct}%</span>"
  echo "          <span class=\"sb-ring-sub\">done</span>"
  echo "        </div>"
  echo "      </div>"
  echo "      <div class=\"sb-ring-info\">"
  echo "        <div class=\"sb-ring-info-label\">Completed</div>"
  echo "        <div class=\"sb-ring-info-val\">${dc}</div>"
  echo "        <div class=\"sb-ring-info-sub\">of ${total} tasks</div>"
  echo "      </div>"
  echo "    </div>"
  echo "    <div class=\"sb-metrics\">"
  echo "      <div class=\"sb-metric\"><div class=\"sb-metric-n\">${tc}</div><div class=\"sb-metric-l\">Todo</div></div>"
  echo "      <div class=\"sb-metric\"><div class=\"sb-metric-n\">${ic}</div><div class=\"sb-metric-l\">Active</div></div>"
  echo "      <div class=\"sb-metric\"><div class=\"sb-metric-n\">${ac}</div><div class=\"sb-metric-l\">Filed</div></div>"
  echo "    </div>"
  echo "  </div>"

  # Search
  echo "  <div class=\"sb-section\">"
  echo "    <div class=\"sb-search-wrap\">"
  echo "      <span class=\"sb-search-icon\">&#x2315;</span>"
  echo "      <input id=\"search\" type=\"text\" placeholder=\"Filter&hellip; or press /\" oninput=\"filterCards()\">"
  echo "    </div>"
  echo "  </div>"

  # Category filters
  echo "  <div class=\"sb-section\">"
  echo "    <span class=\"sb-label\">Category</span>"
  echo "    <div class=\"sb-filter-list\" id=\"cat-filters\">"
  echo "      <button class=\"sb-filter-item on\" onclick=\"filterCat(this,'')\" data-cat=\"\">"
  echo "        <span>All</span>"
  local all_count; all_count=$total
  echo "        <span class=\"sb-filter-count\">${all_count}</span>"
  echo "      </button>"
  while IFS= read -r cat; do
    [[ -z "$cat" ]] && continue
    local ccount; ccount=$(awk -F'|' -v c="$cat" '$3==c{n++}END{print n+0}' "$TASKS_FILE" 2>/dev/null || echo 0)
    echo "      <button class=\"sb-filter-item\" onclick=\"filterCat(this,'$cat')\" data-cat=\"$cat\">"
    echo "        <span>$cat</span>"
    echo "        <span class=\"sb-filter-count\">${ccount}</span>"
    echo "      </button>"
  done <<< "$cats"
  echo "    </div>"
  echo "  </div>"

  # Priority filters
  echo "  <div class=\"sb-section\">"
  echo "    <span class=\"sb-label\">Priority</span>"
  echo "    <div class=\"prio-filter-list\">"
  echo "      <button class=\"prio-filter-item\" onclick=\"filterPrio(this,'P1')\" data-pf=\"P1\"><span class=\"pf-dot p1\"></span>Critical</button>"
  echo "      <button class=\"prio-filter-item\" onclick=\"filterPrio(this,'P2')\" data-pf=\"P2\"><span class=\"pf-dot p2\"></span>High</button>"
  echo "      <button class=\"prio-filter-item\" onclick=\"filterPrio(this,'P3')\" data-pf=\"P3\"><span class=\"pf-dot p3\"></span>Normal</button>"
  echo "    </div>"
  echo "  </div>"

  # Controls
  echo "  <div class=\"sb-controls\">"
  echo "    <button class=\"sb-ctrl\" onclick=\"expandAll()\">Expand</button>"
  echo "    <button class=\"sb-ctrl\" onclick=\"collapseAll()\">Collapse</button>"
  echo "    <button class=\"sb-ctrl\" onclick=\"toggleFocus()\" id=\"focus-btn\">Focus</button>"
  echo "    <button class=\"sb-ctrl\" onclick=\"toggleTheme()\" id=\"theme-btn\">Light</button>"
  echo "  </div>"

  # Footer
  echo "  <div class=\"sb-footer\">"
  echo "    <div class=\"sb-shortcuts\">"
  echo "      <strong>/</strong> search &nbsp;&middot;&nbsp; <strong>A</strong> assistant &nbsp;&middot;&nbsp; <strong>F</strong> focus<br>"
  echo "      <strong>E</strong> expand &nbsp;&middot;&nbsp; <strong>C</strong> collapse &nbsp;&middot;&nbsp; <strong>N</strong> notes &nbsp;&middot;&nbsp; <strong>B</strong> board"
  echo "    </div>"
  echo "  </div>"
  echo "</div>"

  # ── Main ─────────────────────────────────────────────────────────────────────
  echo "<div class=\"main\">"

  # ── Board view ──────────────────────────────────────────────────────────────
  echo "  <div class=\"view active\" id=\"view-board\">"
  echo "    <div class=\"board-head\">"
  echo "      <span class=\"board-hl\">Task board</span>"
  echo "      <div class=\"board-divider\"></div>"
  echo "      <span class=\"board-date\">${today_fmt}</span>"
  echo "    </div>"
  echo "    <div class=\"board\">"

  for def in "${col_defs[@]}"; do
    local col_status col_label col_class
    col_status="${def%%|*}"; col_label="${def##*|}"
    case "$col_status" in
      TODO)        col_class="col-todo" ;;
      IN_PROGRESS) col_class="col-inp"  ;;
      DONE)        col_class="col-done" ;;
      ARCHIVED)    col_class="col-arch" ;;
      *)           col_class="col-custom" ;;
    esac
    local col_count=0
    [[ -s "$TASKS_FILE" ]] && col_count=$(awk -F'|' -v s="$col_status" '$2==s{c++}END{print c+0}' "$TASKS_FILE")

    echo "      <div class=\"col $col_class\">"
    echo "        <div class=\"col-head\">"
    echo "          <span class=\"col-label\">$col_label</span>"
    echo "          <span class=\"col-n\">${col_count}</span>"
    echo "        </div>"
    echo "        <div class=\"col-cards\">"

    local has_any=0
    [[ -s "$TASKS_FILE" ]] && has_any=$(awk -F'|' -v s="$col_status" '$2==s{print 1;exit}' "$TASKS_FILE")

    if [[ -n "$has_any" ]]; then
      local col_cats
      col_cats=$(awk -F'|' -v s="$col_status" '$2==s{print $3}' "$TASKS_FILE" | sort -u)
      while IFS= read -r cat; do
        [[ -z "$cat" ]] && continue
        local cat_count safe_id
        cat_count=$(awk -F'|' -v s="$col_status" -v c="$cat" '$2==s&&$3==c{n++}END{print n+0}' "$TASKS_FILE")
        safe_id="cat-$(printf '%s' "${col_status}-${cat}" | tr ' ' '-' | tr -cd '[:alnum:]-' | tr '[:upper:]' '[:lower:]')"
        echo "          <div class=\"cat-group\">"
        echo "            <div class=\"cat-header collapsed\" onclick=\"toggleCat(this,'$safe_id')\">"
        echo "              <span class=\"cat-arrow\">&#x203A;</span>"
        echo "              <span class=\"cat-name\">$cat</span>"
        echo "              <span class=\"cat-n\">$cat_count</span>"
        echo "            </div>"
        echo "            <div class=\"cat-cards collapsed\" id=\"$safe_id\">"
        while IFS='|' read -r id s c added done_d title; do
          [[ "$s" != "$col_status" || "$c" != "$cat" ]] && continue
          _card "$id" "$s" "$c" "$added" "$done_d" "$title"
        done < "$TASKS_FILE"
        echo "            </div>"
        echo "          </div>"
      done <<< "$col_cats"
    else
      echo "          <div class=\"empty\">Nothing here</div>"
    fi

    echo "        </div>"
    echo "      </div>"
  done

  echo "    </div>"
  echo "  </div>"

  # ── Notes view ──────────────────────────────────────────────────────────────
  echo "  <div class=\"view\" id=\"view-notes\">"
  echo "    <div class=\"notes-container\">"
  echo "      <div class=\"notes-head\">"
  echo "        <div class=\"notes-headline\">Project Notes</div>"
  echo "        <div class=\"notes-actions\">"
  echo "          <span class=\"notes-status\" id=\"notes-status\">Ready</span>"
  echo "          <button class=\"notes-act\" onclick=\"exportNotes()\">Export</button>"
  echo "          <button class=\"notes-act\" onclick=\"clearNotes()\">Clear</button>"
  echo "        </div>"
  echo "      </div>"
  echo "      <textarea id=\"notes-area\" placeholder=\"Free-form. Ideas, decisions, links, context — everything auto-saves.\"></textarea>"
  echo "    </div>"
  echo "  </div>"

  echo "</div>"

  # ── AI Console & JS ─────────────────────────────────────────────────────────
  cat <<'HTML'
<button id="chat-fab" onclick="toggleChat()" title="Intelligence console (A)">✦</button>

<div id="chat-panel">
  <div class="chat-head">
    <div class="chat-title"><span class="ai-pulse"></span>Intelligence Console</div>
    <div class="ch-acts">
      <button class="cibtn" onclick="toggleSettings()" title="Configure">⚙</button>
      <button class="cibtn" onclick="clearChat()" title="Clear">↺</button>
      <button class="cibtn" onclick="toggleChat()">✕</button>
    </div>
  </div>
  <div class="chat-msgs" id="chat-msgs">
    <div class="msg ai">I have full visibility into your task board. Ask me what to prioritize, what's blocking you, or anything about your project state.</div>
  </div>
  <div class="chat-settings" id="chat-settings">
    <span class="slabel">Anthropic API Key</span>
    <input class="sinput" id="api-key-input" type="password" placeholder="sk-ant-api03-…">
    <button class="ssave" onclick="saveKey()">Save to browser</button>
    <div class="shint">Never stored server-side. Sent directly from your browser.</div>
  </div>
  <div class="chat-inp-row">
    <textarea id="chat-input" rows="1" placeholder="Ask anything about your tasks…"></textarea>
    <button id="chat-send" onclick="sendMsg()">↑</button>
  </div>
</div>

<div id="toast"></div>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
const LS = {
  theme:   () => localStorage.getItem('tb-theme') || 'dark',
  key:     () => localStorage.getItem('tb-key') || '',
  view:    () => localStorage.getItem('tb-view') || 'board',
  notes:   () => localStorage.getItem('tb-notes') || '',
  expanded:() => JSON.parse(localStorage.getItem('tb-expanded') || '{}'),
  setExp:  (id, open) => {
    const s = LS.expanded();
    if (open) s[id] = true; else delete s[id];
    localStorage.setItem('tb-expanded', JSON.stringify(s));
  },
};

// ── View switching ────────────────────────────────────────────────────────────
function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-' + v).classList.add('active');
  localStorage.setItem('tb-view', v);
}

// ── Category collapse (default: collapsed) ────────────────────────────────────
function toggleCat(header, id) {
  const cards = document.getElementById(id);
  const nowCollapsed = !cards.classList.contains('collapsed');
  cards.classList.toggle('collapsed', nowCollapsed);
  header.classList.toggle('collapsed', nowCollapsed);
  LS.setExp(id, !nowCollapsed);
}
function expandAll() {
  document.querySelectorAll('.cat-cards').forEach(el => el.classList.remove('collapsed'));
  document.querySelectorAll('.cat-header').forEach(el => el.classList.remove('collapsed'));
  const s = {};
  document.querySelectorAll('.cat-cards[id]').forEach(el => { s[el.id] = true; });
  localStorage.setItem('tb-expanded', JSON.stringify(s));
  toast('All sections expanded');
}
function collapseAll() {
  document.querySelectorAll('.cat-cards').forEach(el => el.classList.add('collapsed'));
  document.querySelectorAll('.cat-header').forEach(el => el.classList.add('collapsed'));
  localStorage.setItem('tb-expanded', '{}');
  toast('All sections collapsed');
}

// ── Notes ─────────────────────────────────────────────────────────────────────
let _noteTimer;
function initNotes() {
  const area = document.getElementById('notes-area');
  area.value = LS.notes();
  area.addEventListener('input', () => {
    clearTimeout(_noteTimer);
    const st = document.getElementById('notes-status');
    st.textContent = 'Saving'; st.className = 'notes-status';
    _noteTimer = setTimeout(() => {
      localStorage.setItem('tb-notes', area.value);
      st.textContent = 'Saved'; st.className = 'notes-status saved';
    }, 700);
  });
}
function exportNotes() {
  const b = new Blob([document.getElementById('notes-area').value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'notes-' + new Date().toISOString().slice(0,10) + '.txt';
  a.click(); URL.revokeObjectURL(a.href);
  toast('Exported');
}
function clearNotes() {
  if (!confirm('Clear all notes?')) return;
  document.getElementById('notes-area').value = '';
  localStorage.removeItem('tb-notes');
  toast('Cleared');
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  _applyTheme(LS.theme());
  const k = LS.key(); if (k) document.getElementById('api-key-input').value = k;
  const sv = LS.view(); if (sv && sv !== 'board') showView(sv);
  const saved = LS.expanded();
  Object.keys(saved).forEach(id => {
    if (!saved[id]) return;
    const el = document.getElementById(id);
    const hdr = el && el.previousElementSibling;
    if (el) { el.classList.remove('collapsed'); hdr && hdr.classList.remove('collapsed'); }
  });
  initNotes();
});

// ── Theme ─────────────────────────────────────────────────────────────────────
function _applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t === 'light' ? 'Dark' : 'Light';
}
function toggleTheme() {
  const n = LS.theme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tb-theme', n); _applyTheme(n);
}

// ── Filter ────────────────────────────────────────────────────────────────────
let _cat = '', _prio = '';
function filterCards() {
  const q = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.card').forEach(c => {
    const catOk  = !_cat  || (c.dataset.cat||'').toLowerCase() === _cat.toLowerCase();
    const prioOk = !_prio || c.dataset.p === _prio;
    const qOk    = !q || (c.dataset.title||'').toLowerCase().includes(q) || (c.dataset.cat||'').toLowerCase().includes(q);
    c.classList.toggle('hidden', !(catOk && prioOk && qOk));
  });
  if (q || _cat || _prio) {
    document.querySelectorAll('.cat-group').forEach(group => {
      const cards = group.querySelector('.cat-cards');
      const hdr   = group.querySelector('.cat-header');
      if ([...group.querySelectorAll('.card')].some(c => !c.classList.contains('hidden'))) {
        cards && cards.classList.remove('collapsed');
        hdr   && hdr.classList.remove('collapsed');
      }
    });
  }
}
function filterCat(el, cat) {
  _cat = cat;
  document.querySelectorAll('#cat-filters .sb-filter-item').forEach(c => c.classList.remove('on'));
  el.classList.add('on'); filterCards();
}
function filterPrio(el, p) {
  _prio = _prio === p ? '' : p;
  document.querySelectorAll('[data-pf]').forEach(c => c.classList.remove('on'));
  if (_prio) el.classList.add('on'); filterCards();
}

// ── Focus mode ────────────────────────────────────────────────────────────────
function toggleFocus() {
  document.body.classList.toggle('focus-mode');
  const btn = document.getElementById('focus-btn');
  const on = document.body.classList.contains('focus-mode');
  btn.textContent = on ? 'Unfocus' : 'Focus';
  btn.classList.toggle('on', on);
  toast(on ? 'Focus mode — showing P1 only' : 'Focus mode off');
}

// ── Copy ID ───────────────────────────────────────────────────────────────────
function copyId(id) {
  navigator.clipboard.writeText('#' + id).catch(() => {});
  toast('#' + id + ' copied');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg) {
  clearTimeout(_tt);
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  _tt = setTimeout(() => el.classList.remove('show'), 2000);
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function toggleChat() {
  const p = document.getElementById('chat-panel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) document.getElementById('chat-input').focus();
}
function toggleSettings() { document.getElementById('chat-settings').classList.toggle('open'); }
function saveKey() {
  localStorage.setItem('tb-key', document.getElementById('api-key-input').value.trim());
  document.getElementById('chat-settings').classList.remove('open');
  toast('Key saved');
}
function clearChat() {
  document.getElementById('chat-msgs').innerHTML = '<div class="msg ai">Console cleared.</div>';
}
function _addMsg(role, text) {
  const msgs = document.getElementById('chat-msgs');
  const el = document.createElement('div'); el.className = 'msg ' + role;
  el.textContent = text; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; return el;
}
async function sendMsg() {
  const inp = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const msg = inp.value.trim(); if (!msg) return;
  const apiKey = LS.key();
  if (!apiKey) { toggleSettings(); toast('Configure API key first'); return; }
  inp.value = ''; _autoResize(); send.disabled = true;
  _addMsg('user', msg);
  const thinking = _addMsg('ai', 'Processing…'); thinking.classList.add('thinking');
  try {
    const r = await fetch('/tasks/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message: msg, apiKey }),
    });
    const d = await r.json();
    thinking.classList.remove('thinking');
    thinking.textContent = d.response || d.error || 'No response.';
  } catch {
    thinking.classList.remove('thinking');
    thinking.textContent = 'Could not reach endpoint.';
  }
  send.disabled = false; inp.focus();
}
function _autoResize() {
  const el = document.getElementById('chat-input');
  if (!el) return; el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('chat-input');
  inp.addEventListener('input', _autoResize);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
});

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (e.key === '/')   { e.preventDefault(); document.getElementById('search').focus(); }
  if (k === 'a')       toggleChat();
  if (k === 'f')       toggleFocus();
  if (k === 'e')       expandAll();
  if (k === 'c')       collapseAll();
  if (k === 'n')       showView('notes');
  if (k === 'b')       showView('board');
  if (e.key === 'Escape') {
    document.getElementById('chat-panel').classList.remove('open');
    document.getElementById('search').blur();
  }
});
</script>
</body>
</html>
HTML

  } > "$HTML_FILE"

  echo -e "${DIM}→ ${HTML_FILE} updated${NC}"
}

# ── Markdown board ────────────────────────────────────────────────────────────

cmd_board() {
  local today; today=$(date +%Y-%m-%d)
  {
    echo "# ${PROJECT_NAME} — Task Board"
    echo "> ${today} · tasks.sh · Never delete — use \`done\` or \`archive\`"
    echo ""
    while IFS= read -r def; do
      [[ -z "$def" ]] && continue
      local status label
      status="${def%%|*}"; label="${def##*|}"
      local count=0; [[ -s "$TASKS_FILE" ]] && count=$(awk -F'|' -v s="$status" '$2==s{c++}END{print c+0}' "$TASKS_FILE")
      echo "---"; echo "## ${label} (${count})"; echo ""
      [[ "$count" -eq 0 ]] && { echo "_Nothing here._"; echo ""; continue; }
      while IFS='|' read -r id s cat added done title; do
        [[ "$s" != "$status" ]] && continue
        local p; p=$(get_priority "$id")
        [[ "$status" == "DONE" || "$status" == "ARCHIVED" ]] \
          && echo "### ~~${p:+[${p}] }[${id}] ${title}~~" \
          || echo "### ${p:+[${p}] }[${id}] ${title}"
        echo "**${cat}** · ${added}${done:+ → ${done}}"; echo ""
        local notes; notes=$(get_notes_md "$id"); [[ -n "$notes" ]] && { echo "$notes"; echo ""; }
      done < "$TASKS_FILE"
    done < <(_col_defs)
  } > "$BOARD_FILE"
  echo -e "${DIM}→ ${BOARD_FILE} updated${NC}"
}

# ── Terminal ──────────────────────────────────────────────────────────────────

cmd_list() {
  echo ""; echo -e "${BOLD}${PROJECT_NAME}${NC}"; echo ""
  while IFS= read -r def; do
    [[ -z "$def" ]] && continue
    local status lbl color
    status="${def%%|*}"; lbl="${def##*|}"
    case $status in
      TODO)        color="$CYAN";;
      IN_PROGRESS) color="$YELLOW";;
      DONE)        color="$GREEN";;
      ARCHIVED)    color="$DIM";;
      *)           color="$NC";;
    esac
    printf "${color}${BOLD}── %-14s ──────────────────────────${NC}\n" "$lbl"
    local found=0
    if [[ -s "$TASKS_FILE" ]]; then
      while IFS='|' read -r id s cat added done title; do
        [[ "$s" != "$status" ]] && continue; found=1
        local p; p=$(get_priority "$id")
        echo -e "  ${BOLD}[${id}]${NC}${p:+ ${RED}${p}${NC}} ${title} ${DIM}(${cat})${NC}"
        get_notes_term "$id"
      done < "$TASKS_FILE"
    fi
    [[ "$found" -eq 0 ]] && echo -e "  ${DIM}(empty)${NC}"; echo ""
  done < <(_col_defs)
}

# ── Import ────────────────────────────────────────────────────────────────────

cmd_import() {
  local id; id=$(next_id)
  printf "%s|%s|%s|%s|%s|%s\n" "$id" "${1:-TODO}" "${2:-General}" "${4:-$(date +%Y-%m-%d)}" "${5:-}" "${3:?}" >> "$TASKS_FILE"
  echo -e "${DIM}Imported [${id}] ${3}${NC}"
}

# ── Open ──────────────────────────────────────────────────────────────────────

cmd_open() {
  cmd_html; sync_kv
  local abs; abs="$(pwd)/${HTML_FILE}"
  echo -e "${GREEN}Opening${NC} file://${abs}"
  open "file://${abs}" 2>/dev/null || xdg-open "file://${abs}" 2>/dev/null || echo "Open: file://${abs}"
}

# ── Help ──────────────────────────────────────────────────────────────────────

cmd_help() {
  echo ""; echo -e "${BOLD}tasks.sh — Project Task Tracker${NC}"; echo ""
  echo -e "  ${CYAN}./tasks.sh open${NC}                      Open board in browser"
  echo -e "  ${CYAN}./tasks.sh add \"Title\" [Cat]${NC}         Add task"
  echo -e "  ${CYAN}./tasks.sh priority ID P1|P2|P3${NC}      Set priority"
  echo -e "  ${CYAN}./tasks.sh start ID${NC}                   Mark in progress"
  echo -e "  ${CYAN}./tasks.sh done ID${NC}                    Mark done (never deleted)"
  echo -e "  ${CYAN}./tasks.sh archive ID${NC}                 Archive"
  echo -e "  ${CYAN}./tasks.sh note ID \"text\"${NC}             Add note to task"
  echo -e "  ${CYAN}./tasks.sh column add \"Label\"${NC}          Add custom column"
  echo -e "  ${CYAN}./tasks.sh column list${NC}                List all columns"
  echo -e "  ${CYAN}./tasks.sh stdlib${NC}                     Add standard dev task set"
  echo -e "  ${CYAN}./tasks.sh sync${NC}                       Push to live URL"
  echo ""
  echo "Keys: B board · N notes · / search · A console · F focus · E expand · C collapse"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────

init

case "${1:-help}" in
  add)      cmd_add "${2:?}" "${3:-General}" ;;
  priority) cmd_priority "${2:?}" "${3:?}" ;;
  start)    cmd_set_status "${2:?}" "IN_PROGRESS" ;;
  done)     cmd_set_status "${2:?}" "DONE" ;;
  archive)  cmd_set_status "${2:?}" "ARCHIVED" ;;
  note)     cmd_note "${2:?}" "${3:?}" ;;
  column)   cmd_column "${2:-list}" "${3:-}" ;;
  stdlib)   cmd_stdlib ;;
  list)     cmd_list ;;
  board)    cmd_board ;;
  html)     cmd_html ;;
  sync)     cmd_html && sync_kv ;;
  open)     cmd_open ;;
  import)   cmd_import "${2:-TODO}" "${3:-General}" "${4:?}" "${5:-}" "${6:-}" ;;
  help|*)   cmd_help ;;
esac
