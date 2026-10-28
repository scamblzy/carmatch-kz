import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
const FAVORITES_STORAGE_KEY = "carmatch:favorites:v1";

interface Car {
  id: string;
  source: string;
  source_listing_id: string | null;
  make: string;
  model: string;
  year: number;
  price_kzt: number;
  mileage_km: number;
  transmission: string;
  body_type: string;
  fuel_type: string;
  city: string;
  source_url: string;
  description: string;
  published_at: string | null;
  last_seen_at: string | null;
}

interface ScoreComponent {
  key: "price" | "year" | "mileage" | "preferred_make";
  label: string;
  score: number;
  weight: number;
  contribution: number;
  available: boolean;
}

interface PriceComparison {
  median_price_kzt: number | null;
  difference_percent: number | null;
  comparable_count: number;
  scope: "city" | "country" | null;
}

interface Recommendation {
  listing: Car;
  score: number;
  score_available: boolean;
  score_breakdown: ScoreComponent[];
  price_comparison: PriceComparison;
  reasons: string[];
  warnings: string[];
}

interface RecommendationResponse {
  items: Recommendation[];
  total: number;
}

interface SearchForm {
  budget_max: string;
  budget_min: string;
  year_min: string;
  year_max: string;
  mileage_max: string;
  transmission: string;
  body_type: string;
  fuel_type: string;
  preferred_make: string;
  city: string;
}

const initialForm: SearchForm = {
  budget_max: "6000000",
  budget_min: "",
  year_min: "2015",
  year_max: "",
  mileage_max: "160000",
  transmission: "automatic",
  body_type: "sedan",
  fuel_type: "petrol",
  preferred_make: "",
  city: "Astana",
};

const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("ru-RU");
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
});

const transmissionLabels: Record<string, string> = {
  automatic: "Автомат",
  manual: "Механика",
};

const bodyTypeLabels: Record<string, string> = {
  sedan: "Седан",
  hatchback: "Хэтчбек",
  suv: "Внедорожник / SUV",
  wagon: "Универсал",
  coupe: "Купе",
  minivan: "Минивэн",
  other: "Другой",
};

const fuelTypeLabels: Record<string, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  hybrid: "Гибрид",
  electric: "Электро",
  lpg: "Газ",
  other: "Другое",
};

function formatPrice(value: number): string {
  return `${currency.format(value)} ₸`;
}

function formatListingFreshness(car: Car): string {
  if (car.last_seen_at) {
    return `Проверено ${dateFormat.format(new Date(car.last_seen_at))}`;
  }

  return "Актуальность не подтверждена";
}

function getFavoriteKey(item: Recommendation): string {
  return `${item.listing.source}:${item.listing.id}`;
}

function loadFavorites(): Recommendation[] {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed as Recommendation[] : [];
  } catch {
    return [];
  }
}

function listingSourceLabel(source: string): string {
  if (source === "demo") return "Демо-каталог";
  if (source === "kolesa.kz") return "Kolesa.kz";
  return source;
}

function transmissionLabel(value: string): string {
  return transmissionLabels[value] ?? value;
}

function bodyTypeLabel(value: string): string {
  return bodyTypeLabels[value] ?? value;
}

function fuelTypeLabel(value: string): string {
  return fuelTypeLabels[value] ?? value;
}

function App() {
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<Recommendation[]>(loadFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }, [favorites]);

  const visibleItems = showFavoritesOnly ? favorites : results;

  function toggleFavorite(item: Recommendation) {
    const favoriteKey = getFavoriteKey(item);

    setFavorites((previous) =>
      previous.some((favorite) => getFavoriteKey(favorite) === favoriteKey)
        ? previous.filter((favorite) => getFavoriteKey(favorite) !== favoriteKey)
        : [item, ...previous],
    );
  }

  function updateField(field: keyof SearchForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResults([]);
    setTotal(null);

    try {
      const budgetMax = Number(form.budget_max);

      if (!Number.isFinite(budgetMax) || budgetMax <= 0) {
        throw new Error("Укажи корректный максимальный бюджет.");
      }

      if (
        form.budget_min.trim() !== "" &&
        Number(form.budget_min) > budgetMax
      ) {
        throw new Error(
          "Минимальный бюджет не может превышать максимальный.",
        );
      }

      if (
        form.year_min.trim() !== "" &&
        form.year_max.trim() !== "" &&
        Number(form.year_min) > Number(form.year_max)
      ) {
        throw new Error(
          "Минимальный год не может быть больше максимального.",
        );
      }

      const payload: Record<string, string | number> = {
        budget_max: budgetMax,
      };

      const numericFields = [
        "budget_min",
        "year_min",
        "year_max",
        "mileage_max",
      ] as const;

      for (const field of numericFields) {
        const value = form[field].trim();

        if (value !== "") {
          const numericValue = Number(value);

          if (!Number.isFinite(numericValue) || numericValue < 0) {
            throw new Error(
              "Проверь числовые параметры поиска.",
            );
          }

          payload[field] = numericValue;
        }
      }

      const stringFields = [
        "transmission",
        "body_type",
        "fuel_type",
        "preferred_make",
        "city",
      ] as const;

      for (const field of stringFields) {
        const value = form[field].trim();

        if (value !== "") {
          payload[field] = value;
        }
      }

      const response = await fetch(
        `${API_URL}/api/v1/recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const details = await response.text();

        throw new Error(
          `API вернул ошибку ${response.status}: ${details}`,
        );
      }

      const data: RecommendationResponse = await response.json();

      setResults(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось выполнить поиск.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Header */}

      <header className="topbar">
        <a className="brand" href="#" aria-label="CarMatch KZ">
          <span className="brand-icon">C</span>

          <span>
            car<span className="brand-accent">match</span>
          </span>

          <span className="brand-country">KZ</span>
        </a>

        <div className="topbar-actions">
          <span className="topbar-label">
            ПОМОЩНИК В ПОКУПКЕ АВТО
          </span>
          <button
            className={`favorites-nav${showFavoritesOnly ? " is-active" : ""}`}
            type="button"
            aria-pressed={showFavoritesOnly}
            aria-label={showFavoritesOnly ? "Вернуться к результатам поиска" : `Открыть избранное, ${favorites.length}`}
            onClick={() => setShowFavoritesOnly((value) => !value)}
          >
            <span aria-hidden="true">♥</span>
            {showFavoritesOnly ? "К результатам" : "Избранное"}
            <strong>{favorites.length}</strong>
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              УМНЫЙ ПОДБОР АВТОМОБИЛЕЙ
            </div>

            <h1>
              Твоя следующая
              <br />
              машина. <span>Без лишнего.</span>
            </h1>

            <p className="hero-description">
              Задай бюджет и требования. Мы сравним подходящие
              автомобили и объясним, почему стоит обратить на них
              внимание.
            </p>

            <div className="hero-points">
              <span>
                <b>01</b> Под твой бюджет
              </span>

              <span>
                <b>02</b> По твоим критериям
              </span>

              <span>
                <b>03</b> С объяснением выбора
              </span>
            </div>
          </div>

          {/* Abstract design instead of car illustrations */}

          <div className="hero-decoration" aria-hidden="true">
            <div className="decoration-grid" />

            <div className="hero-index">
              <span className="hero-index-label">
                CAR MATCHING SYSTEM
              </span>

              <strong>
                01<span> / 03</span>
              </strong>

              <p>
                Меньше шума.
                <br />
                Больше подходящих вариантов.
              </p>
            </div>

            <div className="floating-score">
              <div className="floating-score-head">
                <span>SMART MATCH</span>
                <span className="score-dot" />
              </div>

              <div className="floating-score-value">
                92<span>/100</span>
              </div>

              <div className="mini-score-track">
                <span />
              </div>

              <div className="floating-score-foot">
                <span>Ваши критерии</span>
                <strong>совпадают</strong>
              </div>
            </div>

            <div className="decoration-caption">
              <span>CARMATCH / KZ</span>
              <span>FIND YOUR MATCH</span>
            </div>
          </div>
        </section>

        {/* Search form */}

        <section className="search-section">
          <div className="section-heading">
            <div>
              <span className="section-index">01 / ПАРАМЕТРЫ</span>
              <h2>Какую машину ищем?</h2>
            </div>

            <span className="optional-label">
              Настрой свой поиск
            </span>
          </div>

          <form className="search-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="budget_max">
                Максимальный бюджет, ₸
              </label>

              <input
                id="budget_max"
                type="number"
                min="1"
                required
                value={form.budget_max}
                onChange={(event) =>
                  updateField("budget_max", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="budget_min">
                Минимальный бюджет, ₸
              </label>

              <input
                id="budget_min"
                type="number"
                min="0"
                value={form.budget_min}
                placeholder="Неважно"
                onChange={(event) =>
                  updateField("budget_min", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="preferred_make">Марка</label>

              <input
                id="preferred_make"
                type="text"
                list="car-makes"
                value={form.preferred_make}
                placeholder="Например, Toyota"
                onChange={(event) =>
                  updateField("preferred_make", event.target.value)
                }
              />

              <datalist id="car-makes">
                <option value="Toyota" />
                <option value="Hyundai" />
                <option value="Kia" />
                <option value="Honda" />
                <option value="Chevrolet" />
                <option value="Volkswagen" />
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="city">Город</label>

              <select
                id="city"
                value={form.city}
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
              >
                <option value="">Любой город</option>
                <option value="Astana">Астана</option>
                <option value="Almaty">Алматы</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="year_min">Год выпуска от</label>

              <input
                id="year_min"
                type="number"
                min="1980"
                max="2035"
                value={form.year_min}
                onChange={(event) =>
                  updateField("year_min", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="year_max">Год выпуска до</label>

              <input
                id="year_max"
                type="number"
                min="1980"
                max="2035"
                value={form.year_max}
                placeholder="Неважно"
                onChange={(event) =>
                  updateField("year_max", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="mileage_max">Пробег до, км</label>

              <input
                id="mileage_max"
                type="number"
                min="0"
                value={form.mileage_max}
                placeholder="Неважно"
                onChange={(event) =>
                  updateField("mileage_max", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="transmission">Коробка передач</label>

              <select
                id="transmission"
                value={form.transmission}
                onChange={(event) =>
                  updateField("transmission", event.target.value)
                }
              >
                <option value="">Любая</option>
                <option value="automatic">Автомат</option>
                <option value="manual">Механика</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="body_type">Тип кузова</label>

              <select
                id="body_type"
                value={form.body_type}
                onChange={(event) =>
                  updateField("body_type", event.target.value)
                }
              >
                <option value="">Любой</option>
                <option value="sedan">Седан</option>
                <option value="hatchback">Хэтчбек</option>
                <option value="suv">Внедорожник / SUV</option>
                <option value="wagon">Универсал</option>
                <option value="coupe">Купе</option>
                <option value="minivan">Минивэн</option>
                <option value="other">Другой</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="fuel_type">Тип топлива</label>

              <select
                id="fuel_type"
                value={form.fuel_type}
                onChange={(event) =>
                  updateField("fuel_type", event.target.value)
                }
              >
                <option value="">Любое</option>
                <option value="petrol">Бензин</option>
                <option value="diesel">Дизель</option>
                <option value="hybrid">Гибрид</option>
                <option value="electric">Электро</option>
                <option value="lpg">Газ</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className="form-footer">
              <p>
                <span className="status-dot" />
                Настрой параметры и получи подборку
              </p>

              <button
                className="search-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Ищем варианты..." : "Подобрать авто"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
        </section>

        {/* Error state */}

        {error && (
          <section className="error-panel" role="alert">
            <strong>Не удалось выполнить поиск</strong>
            <p>{error}</p>
            <p>
              Убедись, что FastAPI запущен и доступен по адресу{" "}
              {API_URL}.
            </p>
          </section>
        )}

        {/* Results */}

        {(total !== null || showFavoritesOnly) && (
          <section className="results-section">
            <div className="section-heading results-heading">
              <div>
                <span className="section-index">
                  {showFavoritesOnly ? "02 / ИЗБРАННОЕ" : "02 / РЕЗУЛЬТАТЫ"}
                </span>
                <h2>
                  {showFavoritesOnly ? "Сохранённые автомобили" : "Твои варианты"}
                </h2>
              </div>

              <div className="results-count">
                <strong>{showFavoritesOnly ? favorites.length : total}</strong>
                <span>
                  {showFavoritesOnly ? "в избранном" : "подходящих авто"}
                </span>
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">{showFavoritesOnly ? "♡" : "⌕"}</span>

                <h3>
                  {showFavoritesOnly
                    ? "Пока нет сохранённых авто"
                    : "Пока ничего не нашли"}
                </h3>

                <p>
                  {showFavoritesOnly
                    ? "Добавляй понравившиеся варианты в избранное — они останутся здесь после нового поиска."
                    : "Попробуй увеличить бюджет или изменить ограничения по году и пробегу."}
                </p>
              </div>
            ) : (
              <div className="car-grid">
                {visibleItems.map((item, index) => {
                  const car = item.listing;
                  const isFavorite = favorites.some(
                    (favorite) => getFavoriteKey(favorite) === getFavoriteKey(item),
                  );

                  return (
                    <article className="car-card" key={getFavoriteKey(item)}>
                      <div className="car-card-top">
                        <span className="car-number">
                          {showFavoritesOnly ? "SAVED" : "MATCH"} /{" "}
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="car-card-actions">
                          <button
                            className={`favorite-button${isFavorite ? " is-saved" : ""}`}
                            type="button"
                            aria-label={
                              isFavorite
                                ? "Убрать из избранного"
                                : "Добавить в избранное"
                            }
                            aria-pressed={isFavorite}
                            onClick={() => toggleFavorite(item)}
                          >
                            <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
                            {isFavorite ? "В избранном" : "В избранное"}
                          </button>
                          <span className="score-pill">
                            {item.score_available ? `${item.score}/100` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Minimal listing banner, no car pictures */}

                      <div className="car-card-visual">
                        <div className="car-visual-top">
                          <span>CARMATCH / LISTING</span>
                          <span>{car.year}</span>
                        </div>

                        <div className="car-visual-bottom">
                          <span className="car-visual-type">
                            {bodyTypeLabel(car.body_type)}
                          </span>

                          <span className="car-visual-city">
                            {car.city}
                          </span>
                        </div>
                      </div>

                      <div className="car-title">
                        <h3>
                          {car.make} {car.model}
                        </h3>

                        <span>{car.year} год</span>
                      </div>

                      <div className="car-price">
                        {formatPrice(car.price_kzt)}
                      </div>

                      <div className="listing-meta">
                        <span>Источник: {listingSourceLabel(car.source)}</span>
                        {car.published_at && (
                          <span>
                            Опубликовано {dateFormat.format(new Date(car.published_at))}
                          </span>
                        )}
                        <span>{formatListingFreshness(car)}</span>
                      </div>

                      <div className="car-specs">
                        <div>
                          <span>Пробег</span>
                          <strong>
                            {numberFormat.format(car.mileage_km)} км
                          </strong>
                        </div>

                        <div>
                          <span>Коробка</span>
                          <strong>
                            {transmissionLabel(car.transmission)}
                          </strong>
                        </div>

                        <div>
                          <span>Кузов</span>
                          <strong>
                            {bodyTypeLabel(car.body_type)}
                          </strong>
                        </div>

                        <div>
                          <span>Топливо</span>
                          <strong>
                            {fuelTypeLabel(car.fuel_type)}
                          </strong>
                        </div>
                      </div>

                      {/* Overall score */}

                      <div className="score-description">
                        <div className="score-label">
                          <span>Соответствие запросу</span>
                          <strong>
                            {item.score_available
                              ? `${item.score}/100`
                              : "Недостаточно данных"}
                          </strong>
                        </div>

                        {item.score_available && (
                          <div className="score-track">
                            <div
                              className="score-fill"
                              style={{
                                width: `${item.score}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="price-comparison">
                        <strong>Сравнение цены</strong>
                        {item.price_comparison.median_price_kzt !== null ? (
                          <>
                            <p>
                              Медиана аналогов: {formatPrice(
                                item.price_comparison.median_price_kzt,
                              )}
                            </p>
                            <span>
                              {item.price_comparison.comparable_count} аналогов ·{" "}
                              {item.price_comparison.scope === "city"
                                ? "тот же город"
                                : "по стране"}
                              {item.price_comparison.difference_percent !== null &&
                                ` · ${item.price_comparison.difference_percent > 0 ? "+" : ""}${item.price_comparison.difference_percent}% к медиане`}
                            </span>
                          </>
                        ) : (
                          <p>
                            Найдено аналогов: {item.price_comparison.comparable_count}.
                            {" "}Для сравнения нужно не менее 2.
                          </p>
                        )}
                      </div>

                      {/* Score breakdown */}

                      {item.score_breakdown?.length > 0 && (
                        <div className="score-breakdown">
                          <h4>Из чего складывается оценка</h4>

                          {item.score_breakdown.map((component) => (
                            <div
                              className="breakdown-row"
                              key={component.key}
                            >
                              <div className="breakdown-info">
                                <span>{component.label}</span>

                                <strong>
                                  {component.available
                                    ? `+${component.contribution.toFixed(1)}`
                                    : "нет данных"}
                                </strong>
                              </div>

                              <div className="breakdown-track">
                                <div
                                  className={`breakdown-fill${component.available ? "" : " is-unavailable"}`}
                                  style={{
                                    width: component.available
                                      ? `${component.score}%`
                                      : "0%",
                                  }}
                                />
                              </div>

                              <div className="breakdown-meta">
                                <span>
                                  Критерий: {component.available
                                    ? `${component.score}/100`
                                    : "не учтён"}
                                </span>

                                <span>
                                  Вес:{" "}
                                  {component.available
                                    ? `${Math.round(component.weight * 100)}%`
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasons */}

                      <div className="explanation">
                        <h4>Почему этот вариант?</h4>

                        {item.reasons.slice(0, 4).map((reason) => (
                          <p key={reason}>
                            <span>+</span>
                            {reason}
                          </p>
                        ))}
                      </div>

                      {/* Warnings */}

                      {item.warnings.length > 0 && (
                        <div className="warnings">
                          <h4>Обрати внимание</h4>

                          {item.warnings.slice(0, 3).map((warning) => (
                            <p key={warning}>
                              <span>!</span>
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}

                      <a
                        className="listing-link"
                        href={car.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть объявление
                        <span>↗</span>
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Demo notice */}

        <section className="demo-notice">
          <span className="demo-notice-icon">i</span>

          <div>
            <strong>Демонстрационная версия</strong>

            <p>
              Сейчас используются синтетические данные для тестирования.
              Это не реальные объявления Kolesa.kz, а ссылки в карточках —
              демонстрационные заглушки.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">C</span>

          <span>
            car<span className="brand-accent">match</span>
          </span>

          <span className="brand-country">KZ</span>
        </a>

        <span>НАЙДИ СВОЙ MATCH.</span>
        <span>CARMATCH KZ · MVP 0.1.0</span>
      </footer>
    </div>
  );
}

export default App;
