package codes.som.oof4j.fizzbuzz.enterprise.results;

public interface FizzBuzzResultPublisher {
  void registerSubscriber(FizzBuzzResultSubscriber var1);

  void unregisterSubscriber(FizzBuzzResultSubscriber var1);
}
