const legalLinks = [...document.querySelectorAll('.legal-nav a')];
const legalHeader = document.querySelector('header');
function highlightLegalSection() {
    const offset = (legalHeader?.offsetHeight || 0) + 75;
    document.documentElement.style.setProperty('--legal-offset', (offset - 75) + 'px');
    let selected = legalLinks[0];
    for (const link of legalLinks) {
        if (document.querySelector(link.hash).getBoundingClientRect().top <= offset) selected = link;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) selected = legalLinks.at(-1);
    for (const link of legalLinks) {
        if (link === selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    }
}
highlightLegalSection();
window.addEventListener('scroll', highlightLegalSection, {passive:true});
window.addEventListener('resize', highlightLegalSection);
