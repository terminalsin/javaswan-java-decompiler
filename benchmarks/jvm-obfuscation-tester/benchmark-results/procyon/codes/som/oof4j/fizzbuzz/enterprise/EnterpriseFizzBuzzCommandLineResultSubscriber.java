package codes.som.oof4j.fizzbuzz.enterprise;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;
import java.io.PrintStream;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultSubscriber;

public class EnterpriseFizzBuzzCommandLineResultSubscriber implements FizzBuzzResultSubscriber {
  private final PrintStream outputStream;

  public EnterpriseFizzBuzzCommandLineResultSubscriber(final PrintStream outputStream) {
    this.outputStream = outputStream;
  }

  @Override
  public void onResult(final FizzBuzzResult result) {
    this.outputStream.println("Hello World from FizzBuz! iteration: " + result.getAsString());
  }
}
