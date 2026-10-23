<script setup>
import BaseDocumentPage from '@/components/base/BaseDocumentPage.vue'
</script>

<template>
  <BaseDocumentPage title="Privacy Policy" updated="17 October 2026">
    <section class="mb-8">
      <h2 class="section-heading mb-3">Who is responsible</h2>
      <p class="text-secondary mb-3">
        Unseen Servant (unseenservant.se) is a private hobby project, built and run by
        <strong>Mats K. Eriksson</strong> under the name <strong>Hat Man Studio</strong>. The person
        responsible for the personal data described on this page — the data controller — is Mats K.
        Eriksson. It is not a company and it is not commercially operated: nothing described here is
        done for profit.
      </p>
      <p class="text-secondary">
        Questions about this policy, or about your data, go to
        <a class="element-link" href="mailto:contact@unseenservant.se">contact@unseenservant.se</a>.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">What is stored</h2>
      <p class="text-secondary mb-3">Only what the service needs to work:</p>
      <ul class="list-disc pl-5 space-y-1 text-secondary mb-3">
        <li>
          <strong>Account</strong> — your name and email address as provided by Google or GitHub
          when you sign in, the provider's account identifier, the provider name (Google or GitHub),
          your username in the app and your account role.
        </li>
        <li>
          <strong>What you create</strong> — your characters (including notes, private backstories
          and portraits), campaigns (including world lore and GM notes that only you and your GM can
          read), the messages you post in a campaign, and the images you upload (character, campaign
          and ship images, up to 5 MB per file).
        </li>
        <li>
          <strong>Campaign membership</strong> — which campaigns your account belongs to and with
          which role (owner, GM or player).
        </li>
      </ul>
      <p class="text-secondary">
        There is no advertising and no analytics or tracking code in the app, and nothing beyond the
        above is collected.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Why it is stored</h2>
      <p class="text-secondary">
        Only to run the service: to sign you in, to show your characters and campaigns to you and to
        the people you share a campaign with, and to keep the service secure. That is the only
        purpose. Your data is never sold, never shared with anyone for their own purposes, and never
        used for advertising. Keeping it is necessary to provide the service you sign in to (GDPR
        art. 6(1)(b)) and is in the legitimate interest of running and protecting it (art. 6(1)(f)).
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Where the data is stored</h2>
      <ul class="list-disc pl-5 space-y-1 text-secondary">
        <li>
          On a <strong>home server in Sweden</strong>, which runs the service, its database and the
          uploaded images.
        </li>
        <li>
          <strong>Cloudflare</strong> sits in front of that server and carries the traffic (a tunnel
          and a Worker). As part of that protection and its rate limiting, Cloudflare processes
          request data such as IP addresses, request paths and headers, under its own privacy
          policy. Cloudflare also stores the backups, described below.
        </li>
        <li>
          <strong>Google</strong> and <strong>GitHub</strong> act as the sign-in providers. Your
          password never reaches this app, because signing in happens on their side.
        </li>
      </ul>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Backups</h2>
      <p class="text-secondary mb-3">
        A backup is taken every night and copied to encrypted storage outside the server:
      </p>
      <ul class="list-disc pl-5 space-y-1 text-secondary mb-3">
        <li>
          a private bucket on <strong>Cloudflare R2</strong> (no public access, no custom domain) —
          encrypted before it leaves the server;
        </li>
        <li>an encrypted <strong>USB disk</strong>;</li>
        <li>plus a local, unencrypted copy on the server's own disk.</li>
      </ul>
      <p class="text-secondary">
        Backups are kept for a limited time: 7 daily, 3 weekly and 3 monthly copies, which is
        roughly 7 days, 3 weeks and 3 months. Because of this, data you delete can remain in the
        backups for up to about 3 months before it ages out.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Development and test environments</h2>
      <p class="text-secondary">
        To work on the app, production data is copied to my own development and test machines and to
        a test server in my home. Those environments run on my own hardware and are used only by me.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Your rights</h2>
      <p class="text-secondary mb-3">You can ask me to:</p>
      <ul class="list-disc pl-5 space-y-1 text-secondary mb-3">
        <li>show you what is stored about you (access);</li>
        <li>correct anything that is wrong (rectification);</li>
        <li>delete your data or your whole account (erasure);</li>
        <li>restrict the processing, or object to it (restriction and objection);</li>
        <li>hand your data over in a portable format (data portability).</li>
      </ul>
      <p class="text-secondary mb-3">
        Your data is kept for as long as your account exists. If you want it deleted, send an email
        and it will be removed — remembering that a copy can remain in the backups for up to about 3
        months, as described above.
      </p>
      <p class="text-secondary">
        If you believe your data is being handled incorrectly, you can also complain to the Swedish
        Authority for Privacy Protection (Integritetsskyddsmyndigheten, IMY).
      </p>
    </section>

    <section class="mb-8">
      <h2 class="section-heading mb-3">Cookies and login tokens</h2>
      <p class="text-secondary mb-3">
        There are no tracking or advertising cookies on this site. Two things are stored in your
        browser, only to keep you signed in:
      </p>
      <ul class="list-disc pl-5 space-y-1 text-secondary mb-3">
        <li>
          a short-lived, httpOnly <code>oauth_redirect_origin</code> cookie, set during the sign-in
          round trip with Google or GitHub;
        </li>
        <li>
          your login token (a JWT) in the browser's <code>localStorage</code>, which is sent with
          your requests to the app.
        </li>
      </ul>
      <p class="text-secondary">
        Your colour theme choice is stored locally as well. Guest Demo mode sends nothing to the
        server at all — that mode keeps its data in your browser's <code>localStorage</code>, and it
        disappears with it.
      </p>
    </section>

    <section>
      <h2 class="section-heading mb-3">Changes to this policy</h2>
      <p class="text-secondary">
        If this policy changes, the date at the top changes with it. The current version is always
        on this page.
      </p>
    </section>
  </BaseDocumentPage>
</template>
