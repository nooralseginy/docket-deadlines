# Date calculation

The calculator implements the calendar-day part of FRCP 6(a)(1) and (5): exclude the trigger date, count every intervening day, and move an endpoint on a weekend or recurring federal holiday in the direction of the period. A period measured before an event rolls backward. Weeks mean seven calendar days. For example, 14 days after November 12, 2026 ends on Thanksgiving and rolls to November 27.

An explicit date in an order is shown as written. It is not passed through this period calculator or silently moved.

The built-in holiday calendar uses the eleven recurring federal holidays and their Friday/Monday observations. Juneteenth starts in 2021. It includes an observed New Year's Day falling in the previous calendar year. Date-only UTC arithmetic avoids machine timezone and daylight-saving changes. The calculator accepts periods beginning in 2010 or later; it does not reproduce the older pre-December-2009 counting rule.

This is a limited rules engine. State-declared holidays under 6(a)(6)(C), special holidays declared by the President or Congress, local court closures, clerk-office inaccessibility, local rules, service-method additions under 6(d), hours, filing cutoff times, and contrary court orders require review. The national calendar alone cannot establish that a filing date is safe for a particular district. A missing or ambiguous trigger date also requires review.

Sources checked November 19, 2026:

- [Official Federal Rules of Civil Procedure, December 1, 2025, Rule 6, printed pages 12–14](https://www.uscourts.gov/sites/default/files/document/federal-rules-of-civil-procedure.pdf)
- [OPM federal holiday schedules, including 2021 and 2026 observations](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/)
- [U.S. Naval Observatory: federal holidays and Juneteenth's 2021 start](https://aa.usno.navy.mil/faq/holidays)
