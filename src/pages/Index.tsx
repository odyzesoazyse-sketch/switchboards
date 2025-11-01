import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Timer, Sparkles, CheckCircle, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-6 animate-fade-in">
            <Trophy className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse-glow" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="text-gradient-primary">BreakDance</span>{" "}
            <span className="text-gradient-secondary">Judge</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            Честное судейство брейкданс-баттлов с реал-тайм голосованием и визуализацией для зрителей
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 glow-primary text-lg px-8"
            >
              Начать сейчас
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary/10 text-lg px-8"
            >
              Войти
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Всё для <span className="text-gradient-primary">профессионального</span> судейства
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Роли и управление</CardTitle>
              <CardDescription>
                Организатор, судьи, отборщики - каждый со своим интерфейсом и правами доступа
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Timer className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Реал-тайм оценки</CardTitle>
              <CardDescription>
                Судьи голосуют на своих устройствах, результаты обновляются мгновенно
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Двухфазная система</CardTitle>
              <CardDescription>
                Отбор с оценкой по 3 параметрам, затем олимпийская сетка для топ-16
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Sparkles className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Визуализация</CardTitle>
              <CardDescription>
                Большой экран для зрителей с анимацией голосов и турнирной сеткой
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <CheckCircle className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Честность</CardTitle>
              <CardDescription>
                Анонимное голосование судей, автоматический подсчёт, никакой подтасовки
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Trophy className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Экспорт данных</CardTitle>
              <CardDescription>
                Полная статистика, протоколы и результаты в PDF/CSV для архива
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Как это <span className="text-gradient-secondary">работает</span>
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Создайте баттл</h3>
                <p className="text-muted-foreground">
                  Укажите название, дату, добавьте номинации (Solo, Doubles, Power Moves и т.д.)
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Пригласите команду</h3>
                <p className="text-muted-foreground">
                  Добавьте судей и отборщиков по email, они получат ссылку для входа
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Отбор танцоров</h3>
                <p className="text-muted-foreground">
                  Судьи оценивают выступления по технике, креативу, энергии. Топ-16 проходят в сетку
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xl">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Турнирная сетка</h3>
                <p className="text-muted-foreground">
                  Автоматическая жеребьёвка, судьи голосуют в баттлах, зрители видят всё на большом экране
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Готовы к честному судейству?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Создайте аккаунт и запустите свой первый баттл за 5 минут
          </p>
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
            className="bg-primary hover:bg-primary/90 glow-primary text-lg px-12"
          >
            Начать бесплатно
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 BreakDance Judge. Честное судейство для брейкданс-сообщества.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
