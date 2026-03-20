// +2 each
const STRONG_SIGNALS = [
    /\bresume\b/i,
    /\bcv\b/i,
    /\binterview\b/i,
    /\bschedule\b/i,
    /\bavailability\b/i,
    /\bnext step/i,
    /\bopening\b/i,
    /\bposition\b/i,
    /\brole\b/i,
    /your background/i,
    /\balign/i,
    /\bhiring\b/i,
    /\brecruiter\b/i,
    /\bstaffing\b/i,
    /talent acquisition/i,
    /\bcompensation\b/i,
    /\bsalary\b/i,
    /pay rate/i,
    /job function/i,
    /location preference/i,
    /send your resume/i,
    /looking for candidates/i,
    /would like to connect/i,
    /discuss an? opportunity/i,
];
// +1 each
const MEDIUM_SIGNALS = [
    /\bopportunity\b/i,
    /\bprofile\b/i,
    /\bbackground\b/i,
    /\bin touch\b/i,
    /\bteam.{0,10}hiring/i,
    /\bcompany.{0,10}hiring/i,
];
// -2 each
const NEGATIVE_SIGNALS = [
    /\bnewsletter\b/i,
    /\bsubscribe\b/i,
    /\bcourse\b/i,
    /\bbootcamp\b/i,
    /\bmarketing\b/i,
    /sales demo/i,
    /\bwebinar\b/i,
    /product update/i,
];
// -1 each
const WEAK_PENALTIES = [
    /^let'?s connect$/i, // subject-only vague networking
];
export function scoreJobInterest(email) {
    const c = email.combined;
    let score = 0;
    const reasons = [];
    for (const pat of STRONG_SIGNALS) {
        if (pat.test(c)) {
            score += 2;
            reasons.push(pat.source.replace(/\\b/g, '').replace(/\\/g, ''));
        }
    }
    for (const pat of MEDIUM_SIGNALS) {
        if (pat.test(c)) {
            score += 1;
            reasons.push(pat.source.replace(/\\b/g, '').replace(/\\/g, ''));
        }
    }
    for (const pat of NEGATIVE_SIGNALS) {
        if (pat.test(c)) {
            score -= 2;
            reasons.push(`neg:${pat.source.replace(/\\b/g, '').replace(/\\/g, '')}`);
        }
    }
    for (const pat of WEAK_PENALTIES) {
        if (pat.test(email.subjectLower)) {
            score -= 1;
            reasons.push('vague_networking');
        }
    }
    // No role, no ask, no company context penalty
    if (reasons.length === 0) {
        score -= 1;
    }
    let strength;
    if (score >= 5)
        strength = 'strong';
    else if (score >= 3)
        strength = 'moderate';
    else if (score >= 1)
        strength = 'weak';
    else
        strength = 'none';
    return {
        detected: score >= 3,
        strength,
        score,
        reason: reasons.length > 0 ? reasons.slice(0, 5).join(', ') : null,
    };
}
// ── Classification confidence scoring ───────────────────────
export function scoreConfidence(email, platform, category, companyName, roleTitle, contactName) {
    let conf = 0.40;
    // Platform detected
    if (platform !== 'other' && platform !== 'email')
        conf += 0.25;
    // Subject pattern match
    if (category !== 'unknown')
        conf += 0.20;
    // Body pattern match (body contributed to classification)
    if (email.bodyLower.length > 50)
        conf += 0.15;
    // Extracted fields
    if (companyName)
        conf += 0.10;
    if (roleTitle)
        conf += 0.10;
    if (contactName)
        conf += 0.10;
    // Explicit action phrase
    if (/interview|assessment|rejection|rejected|schedule|coding challenge/i.test(email.combined)) {
        conf += 0.10;
    }
    // Penalties
    if (email.body.length < 30)
        conf -= 0.15; // truncated
    if (category === 'unknown')
        conf -= 0.10;
    if (!companyName && !roleTitle && !contactName)
        conf -= 0.10;
    return Math.min(0.99, Math.max(0.05, conf));
}
export function needsReview(confidence, category, platform, companyName, roleTitle, jobInterestStrength) {
    if (confidence < 0.70)
        return true;
    if (category === 'unknown')
        return true;
    if (platform === 'direct_email' &&
        jobInterestStrength === 'moderate')
        return true;
    if (platform === 'mercor' &&
        category === 'application_update')
        return true;
    if (category !== 'noise' &&
        category !== 'digest' &&
        category !== 'promo' &&
        category !== 'connection_acceptance' &&
        !companyName &&
        !roleTitle)
        return true;
    return false;
}
