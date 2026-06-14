package middleware

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

// KeyCache ดึงและแคช public keys จาก JWKS endpoint ของ Supabase
// (ใช้ verify access token ที่เซ็นแบบ asymmetric: ES256/RS256)
type KeyCache struct {
	url  string
	http *http.Client

	mu        sync.RWMutex
	keys      map[string]crypto.PublicKey
	lastFetch time.Time
}

func NewKeyCache(jwksURL string) *KeyCache {
	return &KeyCache{
		url:  jwksURL,
		http: &http.Client{Timeout: 10 * time.Second},
		keys: map[string]crypto.PublicKey{},
	}
}

// Enabled = มี JWKS URL ให้ใช้หรือไม่
func (k *KeyCache) Enabled() bool { return k != nil && k.url != "" }

// Get คืน public key ตาม kid — ถ้าไม่เจอจะลอง refresh (รองรับ key rotation)
func (k *KeyCache) Get(kid string) (crypto.PublicKey, error) {
	k.mu.RLock()
	key, ok := k.keys[kid]
	k.mu.RUnlock()
	if ok {
		return key, nil
	}
	if err := k.refresh(); err != nil {
		return nil, err
	}
	k.mu.RLock()
	key, ok = k.keys[kid]
	k.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("ไม่พบ signing key (kid=%s)", kid)
	}
	return key, nil
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (k *KeyCache) refresh() error {
	// กัน refresh ถี่เกินไป (อย่างน้อย 10 วินาที)
	k.mu.RLock()
	tooSoon := time.Since(k.lastFetch) < 10*time.Second && len(k.keys) > 0
	k.mu.RUnlock()
	if tooSoon {
		return nil
	}

	res, err := k.http.Get(k.url)
	if err != nil {
		return fmt.Errorf("fetch jwks: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch jwks: status %d", res.StatusCode)
	}

	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return fmt.Errorf("decode jwks: %w", err)
	}

	parsed := make(map[string]crypto.PublicKey, len(doc.Keys))
	for _, key := range doc.Keys {
		pk, err := key.publicKey()
		if err != nil {
			continue // ข้าม key ที่แปลงไม่ได้
		}
		parsed[key.Kid] = pk
	}

	k.mu.Lock()
	k.keys = parsed
	k.lastFetch = time.Now()
	k.mu.Unlock()
	return nil
}

func (j jwk) publicKey() (crypto.PublicKey, error) {
	switch j.Kty {
	case "EC":
		xb, err := base64.RawURLEncoding.DecodeString(j.X)
		if err != nil {
			return nil, err
		}
		yb, err := base64.RawURLEncoding.DecodeString(j.Y)
		if err != nil {
			return nil, err
		}
		var curve elliptic.Curve
		switch j.Crv {
		case "P-256":
			curve = elliptic.P256()
		case "P-384":
			curve = elliptic.P384()
		case "P-521":
			curve = elliptic.P521()
		default:
			return nil, fmt.Errorf("unsupported curve %s", j.Crv)
		}
		return &ecdsa.PublicKey{Curve: curve, X: new(big.Int).SetBytes(xb), Y: new(big.Int).SetBytes(yb)}, nil
	case "RSA":
		nb, err := base64.RawURLEncoding.DecodeString(j.N)
		if err != nil {
			return nil, err
		}
		eb, err := base64.RawURLEncoding.DecodeString(j.E)
		if err != nil {
			return nil, err
		}
		e := 0
		for _, b := range eb {
			e = e<<8 | int(b)
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: e}, nil
	default:
		return nil, fmt.Errorf("unsupported key type %s", j.Kty)
	}
}
