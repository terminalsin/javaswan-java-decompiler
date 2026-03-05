package codes.som.oof4j.fizzbuzz.enterprise;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultSubscriber;
import java.io.PrintStream;

public class EnterpriseFizzBuzzCommandLineResultSubscriber implements FizzBuzzResultSubscriber {
  private final PrintStream outputStream;
  
  public EnterpriseFizzBuzzCommandLineResultSubscriber(PrintStream outputStream) {
    this.outputStream = outputStream;
  }
  
  public void onResult(FizzBuzzResult result) {
    this.outputStream.println("Hello World from FizzBuz! iteration: " + result.getAsString());
  }
}