/**
 * Deterministic classifier test fixtures.
 * Run: npx tsx src/classifier/classifier.test.ts
 *
 * No test framework dependency — uses plain assertions.
 */
import { classifyEmail } from './index.js';
function makeEmail(partial) {
    return {
        uid: 1,
        messageId: undefined,
        from: undefined,
        subject: '',
        date: new Date('2026-03-18T12:00:00Z'),
        text: '',
        inReplyTo: undefined,
        references: undefined,
        ...partial,
    };
}
let passed = 0;
let failed = 0;
function assert(label, actual, expected) {
    if (actual === expected) {
        passed++;
    }
    else {
        failed++;
        console.error(`FAIL: ${label}`);
        console.error(`  expected: ${JSON.stringify(expected)}`);
        console.error(`  actual:   ${JSON.stringify(actual)}`);
    }
}
// ── 1. LinkedIn application confirmation ────────────────────
{
    const email = makeEmail({
        from: { address: 'jobs-noreply@linkedin.com', name: 'LinkedIn' },
        subject: 'Your application was sent to Russell Tobin',
        text: 'Software Engineer - Golang and SQL\nApplied on March 18, 2026\nYour application was sent.',
    });
    const r = classifyEmail(email);
    assert('1: platform', r.platform, 'linkedin');
    assert('1: category', r.category, 'application_confirmation');
    assert('1: priority', r.priority, 'low');
    assert('1: suppress', r.classification.should_suppress, true);
    assert('1: notify', r.classification.should_create_notification, false);
    assert('1: app', r.classification.should_create_or_update_application, true);
    assert('1: lead', r.classification.should_create_or_update_response_lead, false);
    assert('1: company', r.companyName, 'Russell Tobin');
    assert('1: appStatus', r.classification.application_status, 'applied');
    assert('1: appliedDate', r.classification.applied_date, '2026-03-18');
}
// ── 2. LinkedIn rejection ───────────────────────────────────
{
    const email = makeEmail({
        from: { address: 'jobs-noreply@linkedin.com', name: 'LinkedIn' },
        subject: 'Application update at Butler Aerospace & Defense',
        text: 'Engineering Specialist-FLRAA\nWe will not be moving forward with your application at this time.',
    });
    const r = classifyEmail(email);
    assert('2: platform', r.platform, 'linkedin');
    assert('2: category', r.category, 'rejection');
    assert('2: priority', r.priority, 'medium');
    assert('2: suppress', r.classification.should_suppress, false);
    assert('2: notify', r.classification.should_create_notification, true);
    assert('2: app', r.classification.should_create_or_update_application, true);
    assert('2: lead', r.classification.should_create_or_update_response_lead, false);
    assert('2: appStatus', r.classification.application_status, 'rejected');
}
// ── 3. Mercor application confirmation ──────────────────────
{
    const email = makeEmail({
        from: { address: 'noreply@mercor.com', name: 'Mercor' },
        subject: 'Application Submitted - Exceptional Software Engineers (Coding Agent Experience) on Mercor',
        text: "We've received your application. Our team will review it shortly.",
    });
    const r = classifyEmail(email);
    assert('3: platform', r.platform, 'mercor');
    assert('3: category', r.category, 'application_confirmation');
    assert('3: suppress', r.classification.should_suppress, true);
    assert('3: app', r.classification.should_create_or_update_application, true);
    assert('3: lead', r.classification.should_create_or_update_response_lead, false);
    assert('3: company', r.companyName, 'Mercor');
    assert('3: role', r.roleTitle, 'Exceptional Software Engineers (Coding Agent Experience)');
    assert('3: stale applies', r.classification.mercor_stale_rule.applies, true);
    assert('3: stale days', r.classification.mercor_stale_rule.expire_if_no_update_after_days, 30);
}
// ── 4. LinkedIn direct message (founder) ────────────────────
{
    const email = makeEmail({
        from: { address: 'messages-noreply@linkedin.com', name: 'LinkedIn' },
        subject: 'Sean Michael just messaged you',
        text: 'Sean Michael Murphy\nFounder @ MedAx Capital AI-Powered Investment Banking\nView message',
    });
    const r = classifyEmail(email);
    assert('4: platform', r.platform, 'linkedin');
    assert('4: category', r.category, 'inmail_message');
    assert('4: priority', r.priority, 'high');
    assert('4: action', r.actionRequired, true);
    assert('4: notify', r.classification.should_create_notification, true);
    assert('4: lead', r.classification.should_create_or_update_response_lead, true);
    assert('4: contact', r.contactName, 'Sean Michael');
    assert('4: suppress', r.classification.should_suppress, false);
    assert('4: leadType', r.classification.lead_type, 'founder');
}
// ── 5. LinkedIn recruiter/staffing follow-up ────────────────
{
    const email = makeEmail({
        from: { address: 'messages-noreply@linkedin.com', name: 'LinkedIn' },
        subject: 'New opportunity for you',
        text: 'Your background looks to align well with the role. Are you looking into new opportunities? Please attach your resume and let us know your pay rate, location, job function preferences.',
    });
    const r = classifyEmail(email);
    assert('5: platform', r.platform, 'linkedin');
    assert('5: category', r.category, 'recruiter_response');
    assert('5: priority', r.priority, 'high');
    assert('5: action', r.actionRequired, true);
    assert('5: notify', r.classification.should_create_notification, true);
    assert('5: suppress', r.classification.should_suppress, false);
}
// ── 6. Wellfound application confirmation ───────────────────
{
    const email = makeEmail({
        from: { address: 'notifications@wellfound.com', name: 'Wellfound' },
        subject: 'Application to Lead Security Engineer at Midas successfully submitted',
        text: 'Your application has been submitted. You should hear back in 1-2 weeks.',
    });
    const r = classifyEmail(email);
    assert('6: platform', r.platform, 'wellfound');
    assert('6: category', r.category, 'application_confirmation');
    assert('6: suppress', r.classification.should_suppress, true);
    assert('6: app', r.classification.should_create_or_update_application, true);
    assert('6: lead', r.classification.should_create_or_update_response_lead, false);
    assert('6: company', r.companyName, 'Midas');
    assert('6: role', r.roleTitle, 'Lead Security Engineer');
}
// ── 7. Wellfound rejection ──────────────────────────────────
{
    const email = makeEmail({
        from: { address: 'notifications@wellfound.com', name: 'Wellfound' },
        subject: 'An update from Pocket',
        text: "Founding AI Engineer\nUnfortunately, they've chosen to not move forward with your candidacy.",
    });
    const r = classifyEmail(email);
    assert('7: platform', r.platform, 'wellfound');
    assert('7: category', r.category, 'rejection');
    assert('7: notify', r.classification.should_create_notification, true);
    assert('7: app', r.classification.should_create_or_update_application, true);
    assert('7: lead', r.classification.should_create_or_update_response_lead, false);
    assert('7: company', r.companyName, 'Pocket');
    assert('7: appStatus', r.classification.application_status, 'rejected');
}
// ── 8. Direct non-platform employment interest ──────────────
{
    const email = makeEmail({
        from: { address: 'alex@nextstep-recruiting.com', name: 'Alex Yates' },
        subject: 'Opportunity for you',
        text: 'Your background looks strong. We may have opportunities that align. Can you send your resume and desired compensation/location?',
    });
    const r = classifyEmail(email);
    assert('8: platform', r.platform, 'direct_email');
    assert('8: jobInterest', r.classification.job_interest_detected, true);
    assert('8: notify', r.classification.should_create_notification, true);
    // Should be recruiter_response or general_employment_interest
    const validCategory = r.category === 'recruiter_response' || r.category === 'general_employment_interest';
    assert('8: category is recruiter_response or general_employment_interest', validCategory, true);
    assert('8: contact', r.contactName, 'Alex Yates');
}
// ── 9. Connection acceptance (suppressed) ───────────────────
{
    const email = makeEmail({
        from: { address: 'invitations@linkedin.com', name: 'LinkedIn' },
        subject: 'Brian accepted your invitation',
        text: 'You can now message Brian.',
    });
    const r = classifyEmail(email);
    assert('9: platform', r.platform, 'linkedin');
    assert('9: category', r.category, 'connection_acceptance');
    assert('9: suppress', r.classification.should_suppress, true);
    assert('9: lead', r.classification.should_create_or_update_response_lead, false);
}
// ── 10. LinkedIn digest (noise) ─────────────────────────────
{
    const email = makeEmail({
        from: { address: 'jobs-noreply@linkedin.com', name: 'LinkedIn' },
        subject: 'Jobs you might be interested in',
        text: 'Software Engineer at Google, Product Manager at Meta...',
    });
    const r = classifyEmail(email);
    assert('10: platform', r.platform, 'linkedin');
    assert('10: category', r.category, 'digest');
    assert('10: suppress', r.classification.should_suppress, true);
    assert('10: notify', r.classification.should_create_notification, false);
}
// ── 11. Mercor assessment ───────────────────────────────────
{
    const email = makeEmail({
        from: { address: 'noreply@mercor.com', name: 'Mercor' },
        subject: 'Complete your technical assessment',
        text: 'Please complete the coding challenge to proceed with your application on Mercor.',
    });
    const r = classifyEmail(email);
    assert('11: platform', r.platform, 'mercor');
    assert('11: category', r.category, 'assessment');
    assert('11: priority', r.priority, 'high');
    assert('11: action', r.actionRequired, true);
    assert('11: stale applies', r.classification.mercor_stale_rule.applies, false);
}
// ── 12. Mercor combined confirmation + assessment ───────────
{
    const email = makeEmail({
        from: { address: 'noreply@mercor.com', name: 'Mercor' },
        subject: 'Application Submitted - Software Engineer on Mercor',
        text: "We've received your application. Please complete the technical assessment to proceed.",
    });
    const r = classifyEmail(email);
    assert('12: platform', r.platform, 'mercor');
    // Should prefer the stronger state (assessment)
    assert('12: category', r.category, 'assessment');
}
// ── Results ─────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed > 0)
    process.exit(1);
