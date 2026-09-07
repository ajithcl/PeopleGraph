"""Unit tests that do not require Neo4j."""

from datetime import datetime, timedelta, timezone

from peoplegraph.config import is_weak_secret
from peoplegraph.email_service import smtp_configured
from peoplegraph.graph.path_explain import build_path_explanation, explain_hop
from peoplegraph.serializers import invite_status


def test_invite_status_pending():
    props = {
        'revoked': False,
        'usedAt': None,
        'expiresAt': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }
    assert invite_status(props) == 'pending'


def test_invite_status_expired():
    props = {
        'revoked': False,
        'usedAt': None,
        'expiresAt': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    }
    assert invite_status(props) == 'expired'


def test_invite_status_used_and_revoked():
    assert invite_status({'usedAt': '2026-01-01T00:00:00+00:00'}) == 'used'
    assert invite_status({'revoked': True}) == 'revoked'


def test_path_explain_parent():
    hop = explain_hop('Ajith', 'Ishaani', 'HAS_CHILD', True)
    assert 'parent' in hop
    explanation = build_path_explanation([
        {'fromName': 'Ajith', 'toName': 'Ishaani', 'type': 'HAS_CHILD', 'outgoing': True},
    ])
    assert explanation['degree'] == 1
    assert 'Ajith' in explanation['summary']


def test_weak_secrets():
    assert is_weak_secret('')
    assert is_weak_secret('short')
    assert is_weak_secret('dummy-secret-key-change-in-production-xxxxx')
    assert not is_weak_secret('a' * 40)


def test_facebook_and_instagram_urls():
    from peoplegraph.serializers import facebook_profile_url, instagram_profile_url, linkedin_profile_url

    assert facebook_profile_url('ajith.cl') == 'https://www.facebook.com/ajith.cl'
    assert facebook_profile_url('https://www.facebook.com/ajith.cl').startswith('https://www.facebook.com/')
    assert facebook_profile_url('javascript:alert(1)') == ''
    assert facebook_profile_url('https://evil.example/x') == ''
    assert instagram_profile_url('@family') == 'https://www.instagram.com/family'
    assert instagram_profile_url('') == ''
    assert linkedin_profile_url('ajith-kumar') == 'https://www.linkedin.com/in/ajith-kumar'
    assert linkedin_profile_url('in/ajith-kumar') == 'https://www.linkedin.com/in/ajith-kumar'
    assert linkedin_profile_url('https://www.linkedin.com/in/ajith-kumar').startswith('https://www.linkedin.com/')
    assert linkedin_profile_url('javascript:alert(1)') == ''
    assert linkedin_profile_url('https://evil.example/x') == ''


def test_rel_tag_key_from_label():
    from peoplegraph.graph.rel_tags import is_safe_rel_key, label_to_key

    assert label_to_key('Godparent') == 'GODPARENT'
    assert label_to_key('cousin of') == 'COUSIN_OF'
    assert is_safe_rel_key('COUSIN_OF')
    assert not is_safe_rel_key('cousin')
    assert not is_safe_rel_key('HAS_CHILD; DROP')
    assert not is_safe_rel_key('MATCH')
    assert not is_safe_rel_key('')


def test_path_explain_uses_custom_phrases():
    hop = explain_hop(
        'Ajith',
        'Ravi',
        'COUSIN',
        True,
        phrases={'COUSIN': {'forward': '{a} is a cousin of {b}', 'reverse': '{a} is a cousin of {b}', 'label': 'Cousin'}},
    )
    assert hop == 'Ajith is a cousin of Ravi'


def test_dummy_smtp_not_configured(monkeypatch):
    from peoplegraph import config as cfg

    monkeypatch.setattr(cfg.Config, 'SMTP_HOST', 'smtp.example.com')
    monkeypatch.setattr(cfg.Config, 'SMTP_FROM', 'noreply@example.com')
    assert smtp_configured() is False
