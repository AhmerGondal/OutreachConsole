// Blocks to strip from email body before classification
const STRIP_PATTERNS = [
    /summarized by yahoo scout[\s\S]{0,300}?was this (?:message )?summary helpful[^\n]*/gi,
    /summarized by yahoo scout[\s\S]*/gi,
    /was this (?:message )?summary helpful[^\n]*/gi,
    /unsubscribe[\s\S]{0,200}$/gi,
    /you are receiving this[\s\S]{0,300}$/gi,
    /manage (?:email )?preferences[\s\S]{0,200}$/gi,
    /linkedin corporation[\s\S]{0,200}$/gi,
    /\d{4}\s+linkedin\s+corporation[\s\S]*/gi,
    /help\s*\|\s*(?:privacy|terms)[\s\S]*/gi,
    // Recommendation carousels / filler
    /browse more jobs[\s\S]{0,500}/gi,
    /view similar jobs[\s\S]{0,500}/gi,
    /top jobs? for you[\s\S]{0,500}/gi,
    /jobs you (?:may|might) (?:be interested in|like)[\s\S]{0,500}/gi,
    /install linkedin (?:widgets?|feed widget)[\s\S]{0,300}/gi,
    /similar jobs[\s\S]{0,300}/gi,
    /recommended jobs[\s\S]{0,300}/gi,
    /explore opportunities[\s\S]{0,300}/gi,
    /people also viewed[\s\S]{0,300}/gi,
];
export function normalize(raw) {
    const subject = raw.subject || '';
    let body = (raw.text || '').slice(0, 3000);
    // Strip noise blocks
    for (const pat of STRIP_PATTERNS) {
        body = body.replace(pat, '');
    }
    // Collapse whitespace
    body = body.replace(/\s+/g, ' ').trim();
    const subjectLower = subject.toLowerCase();
    const bodyLower = body.toLowerCase();
    return {
        raw,
        subject,
        subjectLower,
        body,
        bodyLower,
        combined: `${subjectLower}\n${bodyLower}`,
        senderAddress: (raw.from?.address || '').toLowerCase(),
        senderName: raw.from?.name || '',
    };
}
